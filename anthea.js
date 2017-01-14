/*--- IMPORTANT GUIDELINES --- 
1. Use div #canvas-svg for svg rendering
    var svg = d3.select("#canvas-svg");
2. 'data' variable contains JSON data from Data tab
   'config' variable contains data from Properties tab
    Do NOT overwrite these variables
3. To define customizable properties, use capitalized variable names,
    and define them in Properties tab ---*/

var BAR_COLOR_1 = config.color1;
var BAR_COLOR_2 = config.color2;

function getCentroid(selection) {
    // get the DOM element from a D3 selection
    // you could also use "this" inside .each()
    var element = selection.node(),
        // use the native SVG interface to get the bounding box
        bbox = element.getBBox();
    // return the center of the bounding box
    return [bbox.x + bbox.width/2, bbox.y + bbox.height/2];
}

var cost_data = {}
data.forEach(function(d) {
    cost_data[d[config.state]] = {};
    cost_data[d[config.state]].charge = d[config.Infants];
    cost_data[d[config.state]].pay = d[config.totalPayments];
})

var width = config.width,
    height = config.height,
    centered,
    radius = Math.min(width, height) / 3;

var projection = d3.geo.albersUsa()
    .scale(600)
    .translate([width / 2, height / 2 + 20]);

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select("#canvas-svg").append("svg")
    .attr("width", width)
    .attr("height", height);

var divs = $("div.tooltips");

if (divs.length === 0) {
    var div = d3.select("#canvas-svg")
        .append("div")
        .attr("class", "tooltips")
        .style("opacity", 0);
} else {
    var div = d3.select("div.tooltips");
}

svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height);

var g = svg.append("g");

var color = d3.scale.ordinal()
    .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

var state_ids = [ 0 ];
var id_state_map = {
    0: ""
};

var id_name_map = {
    0: null
};

var short_name_id_map = {
    0: null
};

d3.tsv("https://s3-us-west-2.amazonaws.com/vida-public/geo/us-state-names.tsv", function(error, names) {

  for (var i = 0; i < names.length; i++) {
      id_name_map[names[i].id] = names[i];
      short_name_id_map[names[i].code] = names[i].id;
  }

  var y = d3.scale.linear().range([ height, 0 ]);

  y.domain([ 0, d3.max(data, function(d) {
      return +d[config.totalPayments];
  }) ]);

  d3.json("https://s3-us-west-2.amazonaws.com/vida-public/geo/us.json", function(error, us) {
    function clicked(d) {
    }

    g.append("g")
        .attr("id", "states")
      .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
      .enter()
        .append("g")
        .attr("class","state-path")
        .attr("state", function(d) {
            return d.state;
        });
  
    svg.selectAll('.state-path')
          .append("path")
          .attr("d", path)
          .attr("centroid", function(d) {
            var centroid = path.centroid(d);
            if (cost_data[id_name_map[d.id].code]) {
              centroid[1] = centroid[1] - cost_data[id_name_map[d.id].code].charge / 1000;
              cost_data[id_name_map[d.id].code].centroid = centroid;
            }
          });

      g.append("path")
        .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
        .attr("id", "state-borders")
        .attr("d", path);

      for (var state in cost_data) {
          g.append("rect")
              .attr("class", "bar_charge")
              .style("fill", BAR_COLOR_1)
              .attr("width", 10)
              .attr("state", state)
              .attr("transform", function(d) {
                  var centroid = cost_data[state].centroid;
                  centroid[0] = centroid[0] - 10;
                  return "translate(" + centroid + ")";
              })
              .attr("height", function(d) {
                  if (cost_data[state]) {
                      return cost_data[state].charge / 1000;
                  } else {
                      return 0;
                  }
              })
              .on("mouseover", function(d) {
                  var state = $(this).attr("state");
                  var centroid = cost_data[state].centroid;
                  var x = centroid[0] - 15;
                  var y = centroid[1] - cost_data[state].charge / 1000 - 20;
                  div.transition().duration(200).style("opacity", 1);
                  div.html(state + "<br/>" + "$" +
                          Math.round(cost_data[state].charge / 1000) + "K")
                      .style("left", x + "px")
                      .style("top", y + "px");
              }).on("mouseout", function(d) {
                  div.transition().duration(500).style("opacity", 0);
              });
          g.append("rect")
              .attr("class", "bar_pay")
              .style("fill", BAR_COLOR_2)
              .attr("state", state)
              .attr("width", 12)
              .attr("transform", function(d) {
                  var centroid = cost_data[state].centroid;
                  centroid[0] = centroid[0] - 5;
                  centroid[1] = centroid[1] + cost_data[state].charge / 1000 - cost_data[state].pay / 1000;
                  return "translate(" + centroid + ")";
              })
              .attr("height", function(d) {
                  if (cost_data[state]) {
                      return cost_data[state].pay / 1000;
                  } else {
                      return 0;
                  }
              })
              .on("mouseover", function(d) {
                  var state = $(this).attr("state");
                  var centroid = cost_data[state].centroid;
                  var x = centroid[0] - 20;
                  var y = centroid[1] - cost_data[state].pay / 1000 - 20;
                  div.transition().duration(200).style("opacity", 1);
                  div.html(state + "<br/>" + "$" +
                          Math.round(cost_data[state].pay / 1000) + "K")
                      .style("left", x + "px")
                      .style("top", y + "px");
              }).on("mouseout", function(d) {
                  div.transition().duration(500).style("opacity", 0);
              });
      }
    
    var legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(-500,20)"; });

    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", BAR_COLOR_1);

    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return "Charge"; });

    var legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(-500,40)"; });

    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", BAR_COLOR_2);

    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return "Pay"; });
  });

});
