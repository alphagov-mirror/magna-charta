$(function() {
  var tables = {};
  $("table").each(function(i, item) {
    var opts = {};
    //tables[item.id] = $.magnaCharta($(item), {applyOnInit: false});
    tables[item.id] = $.magnaCharta($(item));
    if(!tables[item.id].DISABLED) {
      tables[item.id].$table.hide();
    } else {
      tables[item.id].$table.find("caption a").hide();
    }
  });

  $(".toggle").on("click", function(e) {
    var $this = $(this);
    var chart = $this.parents(".mc-chart");
    if(chart.length) {
      // this toggle button is within the chart
      chart.hide().prev().show();
    } else {
      //toggle is within table
      $this.parents("table").hide().next().show();
    }
    e.preventDefault();
  });


});
