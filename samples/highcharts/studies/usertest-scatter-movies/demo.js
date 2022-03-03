/* eslint-disable max-len */
let focusResetElement = null;

function getSeriesDataMetrics(series) {
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    let i = series.data.length;
    while (i--) {
        const p = series.data[i];
        xMin = p.x < xMin ? p.x : xMin;
        xMax = p.x > xMax ? p.x : xMax;
        yMin = p.y < yMin ? p.y : yMin;
        yMax = p.y > yMax ? p.y : yMax;
    }
    return {
        xMin,
        xMax,
        yMin,
        yMax,
        numPoints: series.data.length
    };
}

function getBinnedData(data, dataMetrics, numBins) {
    const binStart = dataMetrics.xMin;
    const xDiff = dataMetrics.xMax - binStart;
    const binXSize = xDiff / numBins;
    const binMaxIx = numBins - 1;

    const bins = [];
    for (let i = 0; i < numBins; ++i) {
        bins.push({
            binStart: binStart + binXSize * i,
            numPoints: 0,
            minY: Infinity,
            maxY: -Infinity
        });
    }

    data.forEach(point => {
        const binIx = Math.min(binMaxIx, Math.floor((point.x - binStart) / binXSize));
        bins[binIx].numPoints++;
        bins[binIx].maxY = Math.max(bins[binIx].maxY, point.y);
        bins[binIx].minY = Math.min(bins[binIx].minY, point.y);
    });

    return bins;
}

function getRefinedBinPoints(binnedData, dataMetrics, detail) {
    const binPoints = [];
    const dataSpan = dataMetrics.yMax - dataMetrics.yMin;
    const detailModifier = Math.sqrt(detail);
    let carryMod = 0;
    binnedData.forEach((bin, ix) => {
        const nextBin = binnedData[ix + 1];
        const binSpreadRatio = (bin.maxY - bin.minY) / dataSpan;
        const binPointRatio = bin.numPoints / dataMetrics.numPoints;

        let mod = carryMod;
        if (bin.numPoints < 3) {
            mod = -1; // expand bin by removing bin point
        } else {
            // Determine add/remove by a points system
            if (bin.numPoints < 5) {
                mod -= 1;
            }
            if (binPointRatio < 0.03 / detailModifier) {
                mod -= 2;
            } else if (binPointRatio < 0.05 / detailModifier) {
                mod -= 1;
            } else if (binPointRatio > 0.30 / detailModifier) {
                mod += 2;
            } else if (binPointRatio > 0.18 / detailModifier) {
                mod += 1;
            }
            if (binSpreadRatio < 0.05 / detailModifier) {
                mod -= 2;
            } else if (binSpreadRatio < 0.15 / detailModifier) {
                mod -= 1;
            } else if (binSpreadRatio > 0.35 / detailModifier) {
                mod += 2;
            } else if (binSpreadRatio > 0.25 / detailModifier) {
                mod += 1;
            }
        }

        if (mod < 0 && bin.binStart === dataMetrics.xMin) {
            carryMod = mod;
            binPoints.push(bin.binStart);
        } else {
            carryMod = 0;
        }

        if (mod >= 0) {
            binPoints.push(bin.binStart);
        }

        if (mod > 0) {
            const nextStart = nextBin ? nextBin.binStart : dataMetrics.xMax;
            binPoints.push((bin.binStart + nextStart) / 2);
        }
    });
    return binPoints;
}

function binDataBySegments(binPoints, data, dataMetrics) {
    const bins = [];
    binPoints.forEach(binPoint => {
        if (bins[bins.length - 1]) {
            bins[bins.length - 1].end = binPoint;
        }
        bins.push({
            start: binPoint,
            yData: []
        });
    });
    if (bins[bins.length - 1]) {
        bins[bins.length - 1].end = dataMetrics.xMax;
    }

    function getBinIx(point) {
        const x = point.x;
        let n = bins.length;
        while (n--) {
            if (x >= bins[n].start && x <= bins[n].end) {
                return n;
            }
        }
        return 0;
    }

    let i = data.length;
    while (i--) {
        const point = data[i];
        const binIx = getBinIx(point);
        bins[binIx].yData.push(point.y);
    }

    return bins;
}

function getTrendDataForSeries(series, detail, seriesMetrics, regularIntervals) {
    if (series.points.length < 3) {
        return series.points.slice(0);
    }

    const numInitialBins = Math.max(3, Math.round(10 * detail));
    const numInitialBinsRegularInterval = numInitialBins + Math.ceil(detail * detail);
    const initialBins = getBinnedData(
        series.points, seriesMetrics, regularIntervals ? numInitialBinsRegularInterval : numInitialBins
    );
    const binPoints = regularIntervals ?
        initialBins.map(b => b.binStart) : getRefinedBinPoints(initialBins, seriesMetrics, detail);

    const binnedData = binDataBySegments(binPoints, series.points, seriesMetrics);
    const avg = arr => arr.reduce((acc, cur) => acc + cur, 0) / arr.length;
    const trendData = binnedData.map(bin => ({
        x: (bin.end - bin.start) / 2 + bin.start,
        y: avg(bin.yData),
        numPoints: bin.yData.length
    }));

    return trendData;
}

function buildDescTreeFromData(data, chartExtremes, xAxis, yAxis) {
    const xValueDecimals = chartExtremes.xMax - chartExtremes.xMin > 10 ? 0 : 1;
    const yValueDecimals = chartExtremes.dataMax - chartExtremes.dataMin > 10 ? 0 : 1;
    let min = Infinity;
    let max = -Infinity;
    let i = data.length;
    while (i--) {
        min = Math.min(min, data[i].y);
        max = Math.max(max, data[i].y);
    }

    let minCount = 0;
    let maxCount = 0;
    data.forEach(values => {
        if (values.y === min) {
            ++minCount;
        }
        if (values.y === max) {
            ++maxCount;
        }
    });

    const descItems = [];
    data.forEach((values, ix) => {
        const nextValues = data[ix + 1];
        const yVal = values.y;
        const nextYVal = nextValues && nextValues.y;
        const descItem = {
            numPointsAveraged: values.numPointsAveraged
        };
        const xValRounded = Math.round((values.x + Number.EPSILON) * Math.pow(1, xValueDecimals)) / Math.pow(1, xValueDecimals);
        const yValRounded = Math.round((values.y + Number.EPSILON) * Math.pow(1, yValueDecimals)) / Math.pow(1, yValueDecimals);
        const dateFormat = (val, axis) => (axis.options.type === 'datetime' ? Highcharts.dateFormat('%H:%M:%S', val) : val);

        descItem.x = dateFormat(xValRounded, xAxis);
        descItem.y = dateFormat(yValRounded, yAxis);

        if (ix === 0) {
            descItem.isStart = true;
            descItem.x = chartExtremes.xMin;
        } else if (!nextValues) {
            descItem.isEnd = true;
            descItem.x = chartExtremes.xMax;
        }

        if (yVal === min) {
            descItem.isLowest = true;
            if (minCount > 1) {
                descItem.hasMultipleLowest = true;
            }
        }

        if (yVal === max) {
            descItem.isHighest = true;
            if (maxCount > 1) {
                descItem.hasMultipleHighest = true;
            }
        }

        if (nextYVal !== undefined) {
            const totalDiff = chartExtremes.dataMax - chartExtremes.dataMin;
            const diffToNext = nextYVal - yVal;
            const absDiff = Math.abs(diffToNext);
            const neutralThreshold = totalDiff / data.length;

            if (absDiff < neutralThreshold / 25) {
                descItem.trend = 0;
            } else {
                const up = diffToNext > 0;
                if (absDiff > neutralThreshold / 0.8) {
                    descItem.trend = up ? 3 : -3;
                } else if (absDiff < neutralThreshold / 5) {
                    descItem.trend = up ? 1 : -1;
                } else {
                    descItem.trend = up ? 2 : -2;
                }
            }
        }

        descItems.push(descItem);
    });

    return descItems;
}

function compressDescTree(descItems) {
    const compressed = [];

    descItems.forEach((desc, ix) => {
        if (desc.isEnd) {
            compressed.push(desc);
        } else {
            const prev = descItems[ix - 1];
            if (!prev || desc.trend !== prev.trend) {
                compressed.push(desc);
            }
        }
    });

    return compressed;
}

function segmentDescTree(descItems, series) {
    function getSegmentIx(point) {
        const x = point.x;
        let n = descItems.length;
        while (n--) {
            if (x >= descItems[n].x) {
                return n;
            }
        }
        return 0;
    }

    let i = series.points.length;
    while (i--) {
        const segmentIx = getSegmentIx(series.points[i]);
        descItems[segmentIx].numPointsInSegment = descItems[segmentIx].numPointsInSegment || 0;
        ++(descItems[segmentIx].numPointsInSegment);
    }

    return descItems;
}

function describeSeriesTrend(series, descItems) {
    let desc;
    const getAxisName = axis =>
        axis.options.accessibility && axis.options.accessibility.description ||
        axis.options.title && axis.options.title.text ||
        (axis.coll === 'xAxis' ? 'x axis value' : 'y axis value');

    const xAxisName = getAxisName(series.xAxis);
    const yAxisName = getAxisName(series.yAxis);

    desc = `<p>The chart is showing ${series.name}, with ${series.points.length} data points.</p><ul role="list" style="list-style-type:none">`;

    descItems.forEach((point, ix) => {
        if (point.isEnd) {
            return;
        }

        desc += '<li>';
        const nextPoint = descItems[ix + 1];
        const nextX = nextPoint && nextPoint.x;
        let segmentPoints = point.numPointsInSegment;

        if (point.isStart) {
            desc += `${series.name} data starts at ${xAxisName} ${point.x}`;
            if (point.isHighest || point.isLowest) {
                desc += `, where ${yAxisName} is ${point.isHighest ? 'highest' : 'lowest'} on average`;
                desc += `, averaging around ${point.y}.`;
            } else {
                desc += `, with ${yAxisName} averaging around ${point.y}.`;
            }
            desc += '</li><li>';
        }

        const subjectWord = ix === 0 ? yAxisName : 'it';

        desc += ix % 2 === 0 ? 'From there ' : 'Then ';

        const trend = point.trend;
        if (trend === 0) {
            desc += ` ${subjectWord} stays flat until around ${xAxisName} ${nextX}`;
        } else {
            let trendModifier;
            const absTrend = Math.abs(trend);
            if (absTrend === 1) {
                trendModifier = ' slightly';
            } else if (absTrend === 2) {
                trendModifier = '';
            } else if (absTrend === 3) {
                trendModifier = ' sharply';
            }
            desc += ` ${subjectWord} goes ${trend > 0 ? 'up' : 'down'}${trendModifier} until around ${xAxisName} ${nextX}`;
        }

        if (nextPoint) {
            if (nextPoint.isEnd) {
                desc += ', where it ends';
                segmentPoints += nextPoint.numPointsInSegment;
            }

            if (nextPoint.isHighest || nextPoint.isLowest) {
                desc += nextPoint.isEnd ? ', and is ' : ', where it is ';
                desc += `${nextPoint.isHighest ? 'highest' : 'lowest'} on average, averaging around ${nextPoint.y}`;
            } else {
                desc += `, averaging around ${nextPoint.y}`;
            }
        }

        desc += `. There are ${segmentPoints} points in this segment.`;
        desc += '</li>';
    });

    desc += '</ul>';

    return desc;
}

function getSeriesStats(series) {
    const getAxisName = axis =>
        axis.options.accessibility && axis.options.accessibility.description ||
        axis.options.title && axis.options.title.text ||
        (axis.coll === 'xAxis' ? 'x axis value' : 'y axis value');
    const dateFormat = (val, axis) => (axis.options.type === 'datetime' ? Highcharts.dateFormat('%H:%M:%S', val) : val);
    let min = Infinity;
    let max = -Infinity;
    let curMin;
    let curMax;

    series.points.forEach(p => {
        if (p.y < min) {
            min = p.y;
            curMin = p;
        } else if (p.y > max) {
            max = p.y;
            curMax = p;
        }
    });

    const yMinDesc = dateFormat(min, series.yAxis);
    const yMaxDesc = dateFormat(max, series.yAxis);

    return `<p>Overall, the minimum ${getAxisName(series.yAxis)} for ${series.name} is ${yMinDesc}, at ${getAxisName(series.xAxis)} ${curMin.x}. ` +
        `The maximum is ${yMaxDesc}, at ${getAxisName(series.xAxis)} ${curMax.x}.</p>`;
}


function updateTrends(chart, detail, regularIntervals) {
    let computerDesc = '<p>Computer generated description:</p>';
    chart.series.forEach(series => {
        const seriesMetrics = getSeriesDataMetrics(series);
        const data = getTrendDataForSeries(series, detail, seriesMetrics, regularIntervals);
        const descItems = buildDescTreeFromData(data, {
            dataMin: chart.yAxis[0].dataMin,
            dataMax: chart.yAxis[0].dataMax,
            xMin: seriesMetrics.xMin,
            xMax: seriesMetrics.xMax
        }, series.xAxis, series.yAxis);
        const compressedDescItems = compressDescTree(descItems);
        const segmentedDescItems = segmentDescTree(compressedDescItems, series);
        const trendDesc = describeSeriesTrend(series, segmentedDescItems);
        const statsDesc = getSeriesStats(series);

        chart.addSeries({
            data,
            color: '#222',
            type: 'spline',
            name: 'Trend line for ' + series.name,
            marker: {
                enabled: true,
                fillColor: '#4c4',
                lineColor: '#000'
            },
            accessibility: {
                point: {
                    descriptionFormatter: function (point) {
                        if (point.index !== 0) {
                            point.graphic.element.setAttribute('aria-hidden', true);
                        }
                        return 'Trend line';
                    }
                }
            }
        });

        computerDesc += trendDesc + statsDesc;
    });
    chart.redraw();

    setTimeout(() => {
        if (!chart.accessibility.computerGeneratedDescContainer) {
            const div = document.createElement('div');
            div.setAttribute('aria-hidden', false);
            div.classList.add('sr-only', 'highcharts-computer-desc');
            chart.accessibility.computerGeneratedDescContainer = div;

            const beforeRegion = chart.accessibility.components.infoRegions.screenReaderSections.before.element;
            beforeRegion.parentNode.insertBefore(div, beforeRegion.nextSibling);
        }
        chart.accessibility.computerGeneratedDescContainer.innerHTML = computerDesc;
    }, 10);
}


function sonifySeries(series) {
    const chart = series.chart;
    focusResetElement = document.activeElement;
    series.update({
        accessibility: {
            enabled: false
        }
    });

    setTimeout(() =>
        series.sonify({
            onEnd: function () {
                if (chart) {
                    chart.xAxis[0].hideCrosshair();
                    if (chart.tooltip) {
                        chart.tooltip.hide(0);
                    }
                    if (series) {
                        series.setState('');
                        series.points.forEach(p => p.setState(''));
                    }
                    if (chart.focusElement) {
                        chart.focusElement.removeFocusBorder();
                    }
                }
                if (focusResetElement) {
                    focusResetElement.focus();
                }
                setTimeout(() => {
                    series.update({
                        accessibility: {
                            enabled: true
                        }
                    });
                }, 100);
            }
        }),
    400);
}

// Configure the visualization
const chart = Highcharts.chart('container', {
    chart: {
        type: 'scatter'
    },
    data: {
        csv: document.getElementById('csv').innerHTML,
        seriesMapping: [{
            x: 1,
            y: 0,
            title: 2
        }],
        parsed: function (columns) {
            const rows = [];
            for (let i = 1; i < columns[0].length; ++i) {
                const row = columns.map(c => c[i]);
                rows.push(row);
            }
            rows.sort((a, b) => a[1] - b[1]);

            columns.forEach((col, colIx) => {
                for (let i = 1; i < col.length; ++i) {
                    col[i] = rows[i - 1][colIx];
                }
            });
        }
    },
    exporting: {
        enabled: false
    },
    sonification: {
        duration: 5000 - parseFloat(document.getElementById('speed').value) * 400,
        masterVolume: 0.4,
        defaultInstrumentOptions: {
            minFrequency: 349,
            maxFrequency: 1568,
            mapping: {
                pan: 'x',
                duration: 260
            }
        },
        events: {
            onPointStart: function (_, point) {
                if (point.highlight) {
                    try {
                        point.highlight();
                    } catch (_) {} // eslint-disable-line
                }
            }
        }
    },
    accessibility: {
        keyboardNavigation: {
            seriesNavigation: {
                mode: 'serialize'
            }
        },
        screenReaderSection: {
            beforeChartFormat: '<{headingTagName}>{chartTitle}</{headingTagName}><div>Scatter plot with trend line. The chart has two data series, displaying Movie ratings and Trend line for Movie ratings.</div><div>{xAxisDescription}</div><div>{yAxisDescription}</div>'
        },
        series: {
            pointDescriptionEnabledThreshold: false
        }
    },
    lang: {
        accessibility: {
            endOfChartMarker: ''
        }
    },
    title: {
        text: 'Movie ratings on IMDB vs Rotten Tomatoes'
    },
    tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.90)',
        formatter: function () {
            const p = this.point.options;
            if (this.series.type === 'spline') {
                return false;
            }
            return `<span style="color:${this.series.color}">\u25CF</span> <span style="font-size: 11px">${p.title}</span><br>IMDB: ${p.x}<br>Rotten Tomatoes: ${p.y}`;
        }
    },
    yAxis: {
        title: {
            text: 'Rotten Tomatoes score'
        },
        accessibility: {
            rangeDescription: 'Data range: 24 to 97.'
        },
        min: 20,
        max: 100
    },
    legend: {
        enabled: false
    },
    xAxis: {
        crosshair: {
            enabled: true
        },
        title: {
            text: 'IMDB score'
        },
        accessibility: {
            rangeDescription: 'Data range: 4.4 to 9.0.'
        },
        min: 2,
        max: 10
    },
    plotOptions: {
        series: {
            states: {
                inactive: {
                    enabled: false
                }
            },
            animation: false
        },
        scatter: {
            accessibility: {
                point: {
                    descriptionFormatter: function (point) {
                        return `${point.options.title}. IMDB rating ${point.options.x}. Rotten Tomatoes score ${point.options.y}.`;
                    }
                }
            }
        },
        spline: {
            tooltip: {
                enabled: false
            },
            includeInDataExport: false,
            marker: { enabled: false },
            enableMouseInteraction: false,
            accessibility: {
                point: {
                    descriptionFormatter: function (point) {
                        return point.options.trendDesc;
                    }
                }
            }
        }
    }
});
chart.series[0].update({ name: 'Movie ratings' });

updateTrends(chart, document.getElementById('detail').value, !document.getElementById('experimentalAlgo').checked);

document.getElementById('speed').onchange = () => chart.update({
    sonification: {
        duration: 5000 - parseFloat(document.getElementById('speed').value) * 400
    }
});
document.getElementById('experimentalAlgo').onchange = document.getElementById('detail').onchange = function () {
    const detail = parseFloat(document.getElementById('detail').value);
    chart.series[1].remove();
    updateTrends(chart, detail, !document.getElementById('experimentalAlgo').checked);
    document.getElementById('detailValueLabel').textContent = '(' + detail.toFixed(1) + ')';
};
document.getElementById('sonifyPlot').onclick = () => sonifySeries(chart.series[0]);
document.getElementById('sonifyTrend').onclick = () => sonifySeries(chart.series[1]);