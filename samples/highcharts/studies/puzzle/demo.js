(function (H) {
    const {
        addEvent,
        Chart,
        each,
        seriesTypes
    } = H;

    Chart.prototype.presentNext = function presentNext() {
        let point;
        for (let sI = 0; sI < this.series.length && !point; sI++) {
            for (
                let pI = 0;
                pI < this.series[sI].points.length && !point;
                pI++
            ) {
                if (this.series[sI].points[pI].inPuzzle) {
                    point = this.series[sI].points[pI];
                }
            }
        }
        if (point) {
            point.graphic.attr({
                display: ''
            }).animate({
                opacity: 1
            }, {
                duration: 500
            });
        }
    };


    Chart.prototype.callbacks.push(function (chart) {
        let total = 0;
        each(chart.series, function (series) {
            if (series.initPuzzle) {
                total += series.initPuzzle();
            }
        });
        chart.puzzle = {
            total: total,
            remaining: total
        };
        chart.puzzleCount = chart.renderer.label('', 10, 5)
            .css({
                fontSize: '30px'
            })
            .add();

        function updateCount(diff) {
            chart.puzzle.remaining += diff;
            chart.puzzleCount.attr({
                text: (chart.puzzle.total - chart.puzzle.remaining) + ' / ' + chart.puzzle.total
            });
        }
        updateCount(0);

        function stopDrag(point) {
            point.dragStart = null;
            chart.dragPoint = null;
        }

        function drop(point) {
            point.graphic
                .attr({
                    translateX: 0,
                    translateY: 0,
                    scaleX: 1,
                    scaleY: 1
                })
                .removeClass('highcharts-puzzle-dragging')
                .addClass('highcharts-puzzle-dropped');

            point.inPuzzle = false;
            stopDrag(point);
            updateCount(-1);
            chart.presentNext();

        }

        function pointerDown(e) {
            const point = e.target.point;
            let   graphic;

            if (point) {
                graphic = point.graphic;

                graphic.toFront();

                e = chart.pointer.normalize(e);
                point.dragStart = {
                    chartX: e.chartX,
                    chartY: e.chartY,
                    scale: graphic.scaleX,
                    translateX: graphic.translateX,
                    translateY: graphic.translateY
                };
                chart.dragPoint = point;
            }
        }

        function pointerMove(e) {
            const point = chart.dragPoint,
                dragStart = point && point.inPuzzle && point.dragStart;

            let startTranslateX,
                startTranslateY,
                translateX,
                translateY,
                dist;

            e = chart.pointer.normalize(e);
            e.preventDefault();
            if (dragStart) {
                // Un-scale to find the true pixel translation
                startTranslateX = dragStart.translateX / dragStart.scale;
                startTranslateY = dragStart.translateY / dragStart.scale;

                // Get the movement
                translateX = startTranslateX + e.chartX - dragStart.chartX;
                translateY = startTranslateY + e.chartY - dragStart.chartY;


                // Pixel distance to target
                dist = Math.sqrt(
                    Math.pow(translateX, 2) +
                    Math.pow(translateY, 2)
                );


                // Proximity snap to the true position
                if (dist < 20) {
                    drop(point);

                // Else, move it along
                } else {
                    point.graphic
                        .attr({
                            scaleX: 1,
                            scaleY: 1,
                            translateX: translateX,
                            translateY: translateY
                        })
                        .addClass('highcharts-puzzle-dragging');
                }
            }
        }

        function pointerUp() {
            if (chart.dragPoint) {
                stopDrag(chart.dragPoint);
            }
        }


        // Set events on the container
        addEvent(this.container, 'mousedown', pointerDown);
        addEvent(this.container, 'touchstart', pointerDown);
        addEvent(this.container, 'mousemove', pointerMove);
        addEvent(this.container, 'touchmove', pointerMove);
        addEvent(this.container, 'mouseup', pointerUp);
        addEvent(this.container, 'touchend', pointerUp);
    });

    seriesTypes.map.prototype.initPuzzle = function () {
        let total = 0;

        if (this.options.puzzle) {

            const seriesScale = this.transformGroups[0].scaleX;

            each(this.points, function (point) {
                const bBox = point.graphic.getBBox(),
                    scale = Math.min(100 / bBox.width, 100 / bBox.height) /
                        seriesScale;

                // Small items are hard to place
                if (bBox.width > 5 && bBox.height > 5) {

                    // Put it in the dock
                    point.graphic.attr({
                        scaleX: scale,
                        scaleY: scale,
                        translateX: -bBox.x * scale,
                        translateY: -bBox.y * scale,
                        opacity: 0,
                        display: 'none'
                    });

                    point.inPuzzle = true;
                    total++;
                }

            });

            this.chart.presentNext();
        }
        return total;
    };

}(Highcharts));

let mapData;

const data = [],
    maps = Highcharts.maps;

for (const n in maps) {
    if (Object.hasOwnProperty.call(maps, n)) {
        mapData = maps[n].features;
        break;
    }
}
mapData.forEach(feature => {
    data.push({
        'hc-key': feature.properties['hc-key'],
        value: 1
    });
});

// Initialize the chart
Highcharts.mapChart('container', {

    title: {
        text: 'Highmaps puzzle',
        style: {
            fontSize: '30px'
        }
    },

    legend: {
        enabled: false
    },

    tooltip: {
        headerFormat: '',
        pointFormat: '{point.name}',
        style: {
            fontSize: '20px'
        }
    },

    plotOptions: {
        series: {
            states: {
                inactive: {
                    opacity: 1
                }
            }
        }
    },

    series: [{
        borderColor: '#e8e8e8',
        mapData: mapData,
        nullColor: 'transparent'
    }, {
        mapData: mapData,
        colorByPoint: true,
        data: data,
        borderColor: '#000000',
        joinBy: 'hc-key',
        puzzle: true,
        states: {
            hover: {
                color: Highcharts.getOptions().colors[2]
            }
        }
    }],

    accessibility: {
        enabled: false
    }
});
