/*
 * magna-charta
 * https://github.com/alphagov/magna-charta
 *
 * Copyright (c) 2012 Jack Franklin
 * Licensed under the MIT license.
 */

(function($) {


  var MagnaCharta = function() {
    this.init = function(table, options) {
      var defaults = {
        outOf: 100,
      };

      this.options = $.extend({}, defaults, options);

      // get padding from the .mc-label
      // negative bars have border right on the label
      // add in auto detection of type of bar

      /* detecting IE version
       * original from James Padolsey: https://gist.github.com/527683
       * and then rewritten by Jack Franklin to pass JSHint
       */
      var ie = (function() {
        var undef,
            v = 3,
            div = document.createElement('div'),
            all = div.getElementsByTagName('i');
        do {
          div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->';
        } while(v < 10 && all[0]);

        return (v > 4) ? v : undef;
      })();


      // if it's IE7 or less, we just show the plain tables
      this.ENABLED = !(ie && ie < 8);

      this.$table = table;


      // set the stacked option based on
      // giving the table a class of mc-stacked
      this.options.stacked = this.$table.hasClass("mc-stacked");

      // set the negative option based on
      // giving the table a class of mc-negative
      this.options.negative = this.$table.hasClass("mc-negative");

      // true if it's a 'multiple' table
      // this means multiple bars per rows, but not stacked.
      this.options.multiple = !this.options.stacked && (
        this.$table.hasClass("mc-multiple") ||
        this.$table.find("tbody tr").first().find("td").length > 2);

      this.options.hasCaption = !!this.$table.find("caption").length;

      if(this.ENABLED) {
        this.apply();
      }

      return this;
    };

    this.apply = function() {
      this.calculateMaxWidth();
      this.applyWidths();
    };


    // some handy utility methods
    this.utils = {
      isFloat: function(val) {
        return !isNaN(parseFloat(val));
      },
      stripValue: function(val) {
        return val.replace('%', '').replace("£", '').replace("m", "");
      },
      returnMax: function(values) {
        var max = 0;
        for(var i = 0; i < values.length; i++) {
          if(values[i] > max) { max = values[i]; }
        }
        return max;
      },
      isNegative: function(value) {
        return (value < 0);
      }
    };

    this.addClassesToHeader = function() {
      var that = this;
      var headerCells = this.$graph.find("th");
      if(this.options.stacked) {
        headerCells.last().addClass("mc-stacked-header");
      }
      headerCells = headerCells.filter(":not(:first)");
      if(that.options.stacked) {
        headerCells.last().addClass("mc-header-total");
        headerCells = headerCells.filter(":not(:last)");
      }
      headerCells.addClass("mc-key-header");
      headerCells.filter(":not(.mc-stacked-header)").each(function(i, item) {
        $(item).addClass("mc-key-" + (i+1));
      });
    };


    this.calculateMaxWidth = function() {

      // JS scoping sucks
      var that = this;

      // store the cell values in here so later
      // so we can figure out the maximum value later
      var values = [];


      // var to store the maximum negative value
      // (used only for negative charts)
      var maxNegativeValue = 0;

      // loop through every tr in the table
      this.$table.find("tr").each(function(i, item) {
        var $this = $(item);

        // the first td is going to be the key, so ignore it
        var $bodyCells = $this.find("td:not(:first)");

        // if it's stacked, the last column is a totals
        // so we don't want that in our calculations
        if(that.options.stacked) {
          var $stackedTotal = $bodyCells.last().addClass("mc-stacked-total");
          $bodyCells = $bodyCells.filter(":not(:last)");
        }

        // first td in each row is key
        $this.find("td:first").addClass("mc-label");

        // store the total value of the bar cells in a row
        // for anything but stacked, this is just the value of one <td>
        var cellsTotalValue = 0;

        $bodyCells.each(function(j, cell) {

          var $cell = $(cell).addClass("mc-bar").addClass("mc-bar-" + (j+1));

          var cellVal = that.utils.stripValue($cell.text());

          if(that.utils.isFloat(cellVal)) {

            var parsedVal = parseFloat(cellVal, 10);
            var absParsedVal = Math.abs(parsedVal);

            if(that.options.negative) {

              if(that.utils.isNegative(parsedVal)) {

                $cell.addClass("mc-bar-negative");

                if(absParsedVal > maxNegativeValue) {
                  maxNegativeValue = absParsedVal;
                }

              } else {

                $cell.addClass("mc-bar-positive");
              }

            }
            // now we are done with our negative calculations
            // set parsedVal to absParsedVal
            parsedVal = absParsedVal;

            if(!that.options.stacked) {
              cellsTotalValue = parsedVal;
              values.push(parsedVal);
            } else {
              cellsTotalValue += parsedVal;
            }
          }
        });

        // if stacked, we need to push the total value of the row
        // to the values array
        if(that.options.stacked) { values.push(cellsTotalValue); }

      });

      var resp = {};

      resp.max = parseFloat(that.utils.returnMax(values), 10);
      resp.single = parseFloat(this.options.outOf/resp.max, 10);

      if(this.options.negative) {
        resp.marginLeft = parseFloat(maxNegativeValue, 10) * resp.single;
        resp.maxNegative = parseFloat(maxNegativeValue, 10);
      }


      return resp;
    };

    this.applyWidths = function() {
      this.dimensions = this.calculateMaxWidth();

      var extraPadding = parseFloat(this.$table.find(".mc-label").css("padding-right"), 10);

      var that = this;

      this.$table.find("tr").each(function(i, row) {

        var $this = $(row);

        $this.find(".mc-bar").each(function(j, cell) {

          var $cell = $(cell);
          var $label = $cell.prev();

          var parsedCellVal = parseFloat(that.utils.stripValue($cell.text()), 10);

          var parsedVal = parsedCellVal * that.dimensions.single + extraPadding;

          var absParsedCellVal = Math.abs(parsedCellVal);
          var absParsedVal = Math.abs(parsedVal);

          // apply the left margin to the positive bars
          if(that.options.negative) {

            if($cell.hasClass("mc-bar-positive")) {

              $cell.css("border-left-width", that.dimensions.marginLeft + "px");

            } else {

              // the border is applied on the right to the label
              // if its negative but not the maximum negative
              // we need to give it enough margin to push it further right to align
              if(absParsedCellVal < that.dimensions.maxNegative ) {
                // left margin needs to be
                // (largestNegVal - thisNegVal)*single
                var leftMarg = (that.dimensions.maxNegative - absParsedCellVal) * that.dimensions.single;
                $label.css("border-right-width", absParsedVal + "px")
                $label.css("padding-right", extraPadding + leftMarg + "px");
              }
            }
          } else {
            // not negative
            $cell.css("border-left-width", absParsedVal + "px");
          }


        });
      });
    };

  };


  $.magnaCharta = function(table, options) {
    return new MagnaCharta().init(table, options);
  };


}(jQuery));

