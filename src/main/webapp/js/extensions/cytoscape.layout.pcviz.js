/*
 * Copyright 2013 Memorial-Sloan Kettering Cancer Center.
 *
 * This file is part of PCViz.
 *
 * PCViz is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * PCViz is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with PCViz. If not, see <http://www.gnu.org/licenses/>.
 */

/*
 * PCViz Layout
 *  - a grid like layout with location history features
 */
;(function($$){
    var defaults = {
        fit: true, // whether to fit the viewport to the graph
        rows: undefined, // force num of rows in the grid
        columns: undefined, // force num of cols in the grid
        ready: undefined, // callback on layoutready
        stop: undefined, // callback on layoutstop
        height: undefined,
        width: undefined,
        fitPadding: 50
    };

    function PCVizLayout( options ){
        this.options = $$.util.extend({}, defaults, options);
    }

    PCVizLayout.prototype.run = function(){
        var params = this.options;
        var options = params;

        var cy = params.cy;
        var nodes = cy.nodes();
        var edges = cy.edges();
        var container = cy.container();

        var width = options.width == undefined ? container.clientWidth : options.width;
        var height = options.height == undefined ? container.clientHeight : options.height;

        if( height == 0 || width == 0){
            nodes.positions(function(){
                return { x: 0, y: 0 };
            });

        } else {
            // width/height * splits^2 = cells where splits is number of times to split width
            var cells = nodes.size();
            var splits = Math.sqrt( cells * height/width );
            var rows = Math.round( splits );
            var cols = Math.round( width/height * splits );

            function small(val){
                if( val == undefined ){
                    return Math.min(rows, cols);
                } else {
                    var min = Math.min(rows, cols);
                    if( min == rows ){
                        rows = val;
                    } else {
                        cols = val;
                    }
                }
            }

            function large(val){
                if( val == undefined ){
                    return Math.max(rows, cols);
                } else {
                    var max = Math.max(rows, cols);
                    if( max == rows ){
                        rows = val;
                    } else {
                        cols = val;
                    }
                }
            }

            // if rows or columns were set in options, use those values
            if( options.rows != null && options.columns != null ){
                rows = options.rows;
                cols = options.columns;
            } else if( options.rows != null && options.columns == null ){
                rows = options.rows;
                cols = Math.ceil( cells / rows );
            } else if( options.rows == null && options.columns != null ){
                cols = options.columns;
                rows = Math.ceil( cells / cols );
            }

            // otherwise use the automatic values and adjust accordingly

            // if rounding was up, see if we can reduce rows or columns
            else if( cols * rows > cells ){
                var sm = small();
                var lg = large();

                // reducing the small side takes away the most cells, so try it first
                if( (sm - 1) * lg >= cells ){
                    small(sm - 1);
                } else if( (lg - 1) * sm >= cells ){
                    large(lg - 1);
                }
            } else {
                // if rounding was too low, add rows or columns
                while( cols * rows < cells ){
                    var sm = small();
                    var lg = large();

                    // try to add to larger side first (adds less in multiplication)
                    if( (lg + 1) * sm >= cells ){
                        large(lg + 1);
                    } else {
                        small(sm + 1);
                    }
                }
            }

            var cellWidth = width / cols;
            var cellHeight = height / rows;

            var row = 0;
            var col = 0;
            nodes.positions(function(i, element){

                if( element.locked() ){
                    return false;
                }

                var eId = element.id();
                if(store.enabled) {
                    var savedLocation = store.get(eId);
                    if(savedLocation != null) {
                        return savedLocation;
                    }

                }

                var x = col * cellWidth + cellWidth/2;
                var y = row * cellHeight + cellHeight/2;

                col++;
                if( col >= cols ){
                    col = 0;
                    row++;
                }

                var positions = { x: x, y: y };
                if(store.enabled) {
                    store.set(eId, positions);
                }
                return positions;
            });
        }

        if( params.fit ){
            cy.reset().fit();
        }

        cy.one("layoutready", params.ready);
        cy.trigger("layoutready");

        cy.one("layoutstop", params.stop);
        cy.trigger("layoutstop");
    };

    PCVizLayout.prototype.stop = function(){
        // not a continuous layout
    };

    $$("layout", "pcviz", PCVizLayout);

})( cytoscape );