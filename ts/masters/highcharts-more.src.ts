/**
 * @license Highcharts JS v@product.version@ (@product.date@)
 * @module highcharts/highcharts-more
 * @requires highcharts
 *
 * (c) 2009-2021 Torstein Honsi
 *
 * License: www.highcharts.com/license
 */
'use strict';
import Highcharts from '../Core/Globals.js';
import RadialAxis from '../Core/Axis/RadialAxis.js';
const G: AnyRecord = Highcharts;
import '../Extensions/Pane.js';
RadialAxis.compose(G.Axis, G.Tick);
import '../Series/AreaRange/AreaRangeSeries.js';
import '../Series/AreaSplineRange/AreaSplineRangeSeries.js';
import '../Series/ColumnRange/ColumnRangeSeries.js';
import '../Series/ColumnPyramid/ColumnPyramidSeries.js';
import '../Series/Gauge/GaugeSeries.js';
import '../Series/BoxPlot/BoxPlotSeries.js';
import '../Series/ErrorBar/ErrorBarSeries.js';
import '../Series/Waterfall/WaterfallSeries.js';
import '../Series/Polygon/PolygonSeries.js';
import '../Series/Bubble/BubbleSeries.js';
import '../Series/PackedBubble/PackedBubbleSeries.js';
import '../Extensions/Polar.js';
