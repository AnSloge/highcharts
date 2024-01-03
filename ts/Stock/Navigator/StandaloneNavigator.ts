/* *
 *
 *  (c) 2010-2023 Mateusz Bernacik
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

'use strict';

/* *
 *
 *  Imports
 *
 * */

import type { StandaloneNavigatorOptions } from './NavigatorOptions';
import type { SeriesOptions } from '../../Core/Series/SeriesOptions';
import type { Options } from '../../Core/Options';
import Chart from '../../Core/Chart/Chart.js';
import Navigator from './Navigator.js';
import G from '../../Core/Globals.js';
import U from '../../Core/Utilities.js';
import Axis from '../../Core/Axis/Axis.js';
import standaloneNavigatorDefaults from './StandaloneNavigatorDefaults.js';
const {
    merge,
    addEvent,
    fireEvent,
    pick
} = U;

declare module '../../Core/GlobalsLike.d.ts' {
    interface GlobalsLike {
        navigators: Array<StandaloneNavigator>;
    }
}

/* *
 *
 *  Class
 *
 * */

/**
 * The StandaloneNavigator class. The StandaloneNavigator class allows for
 * creating a standalone navigator component that synchronizes the extremes
 * across multiple bound charts.
 *
 * @class
 * @name Highcharts.StandaloneNavigator
 *
 * @param {string|Highcharts.HTMLDOMElement} [renderTo]
 * The DOM element to render to, or its id.
 *
 * @param {StandaloneNavigatorOptions} userOptions
 * The standalone navigator options.
 */
class StandaloneNavigator {

    public eventsToUnbind: Array<Function> = [];
    public navigator: Navigator;
    public boundAxes: Array<Axis> = [];
    public options: Partial<Options>;
    public userOptions: StandaloneNavigatorOptions;

    /* *
     *
     *  Static Functions
     *
     * */

    /**
     * Factory function for standalone navigator.
     *
     * @function Highcharts.navigator
     *
     * @param {string|Highcharts.HTMLDOMElement} [renderTo]
     * The DOM element to render to, or its id.
     *
     * @param {StandaloneNavigatorOptions} options
     * The standalone navigator options with chart-like structure.
     *
     * Returns the navigator object.
     */
    public static navigator(
        renderTo: (string|globalThis.HTMLElement),
        options: StandaloneNavigatorOptions
    ): StandaloneNavigator {
        const nav = new StandaloneNavigator(renderTo, options);

        if (!G.navigators) {
            G.navigators = [nav];
        } else {
            G.navigators.push(nav);
        }

        return nav;
    }


    /* *
     *
     *  Constructor
     *
     * */

    constructor(
        element: (string | globalThis.HTMLElement),
        userOptions: StandaloneNavigatorOptions
    ) {
        this.userOptions = userOptions;
        this.options = merge(
            (G as any).getOptions(),
            standaloneNavigatorDefaults,
            { navigator: userOptions }
        );

        const chart = new Chart(element, this.options);

        this.navigator = new Navigator(chart);
        chart.navigator = this.navigator;
        this.initNavigator();
    }

    /**
     * Binds an axis to the standalone navigator,
     * allowing the navigator to control the axis' range.
     *
     * @sample stock/standalone-navigator/bind/
     *         Bind chart with a button
     *
     * @function Highcharts.StandaloneNavigator#bind
     *
     * @param {Axis | Chart} axisOrChart
     *        The Axis or Chart to bind to the navigator.
     */
    public bind(axisOrChart: Axis | Chart): void {
        const nav = this;
        // If the chart is passed, bind the first xAxis
        const axis = (axisOrChart instanceof Chart) ?
            axisOrChart.xAxis[0] :
            axisOrChart;

        if (!(axis instanceof Axis)) {
            return;
        }

        const { min, max } = this.navigator.xAxis;

        this.boundAxes.push(axis);

        // Show axis' series in navigator based on showInNavigator property
        axis.series.forEach((series): void => {
            if (series.options.showInNavigator) {
                nav.addSeries(series.options);
            }
        });

        // Set extremes to match the navigator's extremes
        axis.setExtremes(min, max);
    }

    /**
     * Unbinds a single axis or all bound axes from the standalone navigator.
     *
     * @sample stock/standalone-navigator/unbind/
     *         Unbind chart with a button
     *
     * @function Highcharts.StandaloneNavigator#unbind
     *
     * @param {Chart | Axis | undefined} axisOrChart
     *        Passing a Chart object unbinds the first X axis of the chart,
     *        an Axis object unbinds that specific axis,
     *        and undefined unbinds all axes bound to the navigator.
     */
    public unbind(axisOrChart?: Chart | Axis): void {
        // If no axis or chart is provided, unbind all bound axes
        if (!axisOrChart) {
            this.boundAxes.length = 0;
            return;
        }

        const axis = (axisOrChart instanceof Axis) ?
            axisOrChart :
            axisOrChart.xAxis[0];

        this.boundAxes = this.boundAxes.filter((a): boolean => a !== axis);
    }


    /**
     * Destroys allocated standalone navigator elements.
     *
     * @function Highcharts.StandaloneNavigator#destroy
     */
    public destroy(): void {
        // Disconnect events
        this.eventsToUnbind.forEach((f): void => {
            f();
        });
        this.boundAxes.length = 0;
        this.eventsToUnbind.length = 0;
        this.navigator.destroy();
        this.navigator.chart.destroy();
    }

    /**
     * Updates the standalone navigator's options with a new set of user
     * options.
     *
     * @function Highcharts.StandaloneNavigator#update
     *
     * @param  {StandaloneNavigatorOptions} newOptions
     *         Updates the standalone navigator's options with new user options.
     *
     * @param  {boolean | undefined} redraw
     *         Whether to redraw the standalone navigator. By default, if not
     *         specified, the standalone navigator will be redrawn.
     */
    public update(
        newOptions: StandaloneNavigatorOptions,
        redraw?: boolean
    ): void {
        this.options = merge(this.options, { navigator: newOptions });

        this.navigator.chart.update(this.options, redraw);
    }

    /**
     * Redraws the standalone navigator.
     *
     * @function Highcharts.StandaloneNavigator#redraw
     */
    public redraw(): void {
        this.navigator.chart.redraw();
    }

    /**
     * Adds a series to the standalone navigator.
     *
     * @private
     *
     * @param {SeriesOptions} seriesOptions
     *        Options for the series to be added to the navigator.
     */
    public addSeries(seriesOptions: SeriesOptions): void {
        this.navigator.chart.addSeries(merge(
            seriesOptions,
            { showInNavigator: pick(seriesOptions.showInNavigator, true) }
        ));

        this.navigator.setBaseSeries();
    }

    /**
     * Initialize the standalone navigator.
     *
     * @private
     */
    public initNavigator(): void {
        const nav = this.navigator;
        nav.top = 1;
        nav.xAxis.setScale();
        nav.yAxis.setScale();
        nav.xAxis.render();
        nav.yAxis.render();
        nav.series?.forEach((s): void => {
            s.translate();
            s.render();
            s.redraw();
        });

        const { min, max } = this.getInitialExtremes();
        nav.render(min, max);

        this.eventsToUnbind.push(
            addEvent(
                this.navigator.chart.xAxis[0],
                'setExtremes',
                (e): void => {
                    const { min, max } = e as { min: number, max: number };

                    this.boundAxes.forEach((axis): void => {
                        axis.setExtremes(min, max);
                    });
                }
            )
        );
    }

    /**
     * Get the current range of the standalone navigator.
     *
     * @sample stock/standalone-navigator/getrange/
     *         Report the standalone navigator's range by clicking on a button
     *
     * @function Highcharts.StandaloneNavigator#getRange
     *
     * @return {Highcharts.ExtremesObject}
     *         The current range of the standalone navigator.
     */
    public getRange(): Axis.ExtremesObject {
        const { min, max } = this.navigator.chart.xAxis[0].getExtremes(),
            { userMin, userMax, min: dataMin, max: dataMax } =
                this.navigator.xAxis.getExtremes();

        return {
            min: pick(min, dataMin),
            max: pick(max, dataMax),
            dataMin,
            dataMax,
            userMin,
            userMax
        };
    }

    /**
     * Set the range of the standalone navigator.
     *
     * @sample stock/standalone-navigator/setrange/
     *         Set range from a button
     *
     * @function Highcharts.StandaloneNavigator#setRange
     *
     * @param {number | undefined} min
     *        The new minimum value.
     *
     * @param {number | undefined} max
     *        The new maximum value.
     *
     * @emits Highcharts.StandaloneNavigator#event:setRange
     */
    public setRange(min?: number, max?: number): void {
        fireEvent(
            this.navigator,
            'setRange',
            { min, max, trigger: 'navigator' }
        );
    }

    /**
     * Get the initial, options based extremes for the standalone navigator.
     *
     * @private
     *
     * @return {{ min: number, max: number }}
     *         The initial minimum and maximum extremes values.
     */
    public getInitialExtremes(): { min: number, max: number } {
        const { min, max } = this.navigator.xAxis.getExtremes();

        return {
            min: min,
            max: max
        };
    }
}

export default StandaloneNavigator;

/* *
 *
 *  API Declarations
 *
 * */

/**
 * Standalone Navigator options.
 *
 * @interface Highcharts.StandaloneNavigatorOptions
 *//**
 */

''; // detach doclets above
