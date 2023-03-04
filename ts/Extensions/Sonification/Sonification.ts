/* *
 *
 *  (c) 2009-2022 Øystein Moseng
 *
 *  Sonification module.
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

'use strict';

/* *
 *
 *  Type imports
 *
 * */

import type Chart from '../../Core/Chart/Chart';
import type Series from '../../Core/Series/Series';
import type Point from '../../Core/Series/Point';
import type { Options } from '../../Core/Options';
import type { PropMetrics } from './TimelineFromChart';

/* *
 *
 *  Imports
 *
 * */

import D from '../../Core/Defaults.js';
const {
    defaultOptions,
    getOptions
} = D;
import U from '../../Core/Utilities.js';
const {
    addEvent,
    extend,
    fireEvent,
    merge,
    pick
} = U;
import H from '../../Core/Globals.js';
const {
    doc,
    win
} = H;
import defaultSonificationOptions from './Options.js';
import SonificationTimeline from './SonificationTimeline.js';
import SonificationInstrument from './SonificationInstrument.js';
import SynthPatch from './SynthPatch.js';
import InstrumentPresets from './InstrumentPresets.js';
import timelineFromChart from './TimelineFromChart.js';


declare module '../../Core/Chart/ChartLike' {
    interface ChartLike {
        sonification?: Sonification;
        /** @requires modules/sonification */
        sonify: (onEnd?: Function) => void;
        /** @requires modules/sonification */
        updateSonificationEnabled: () => void;
    }
}
declare module '../../Core/Series/SeriesLike' {
    interface SeriesLike {
        sonify: (onEnd?: Function) => void;
    }
}
declare module '../../Core/Series/PointLike' {
    interface PointLike {
        sonify: () => void;
    }
}


/**
 * @private
 */
class Sonification {
    forceReady?: boolean; // Used for testing (when working audio is not needed)
    propMetrics?: PropMetrics; // Used for testing, updated on timeline creation
    timeline?: SonificationTimeline;
    audioContext?: AudioContext;
    unbindKeydown: Function;
    private retryContextCounter = 0;
    private lastUpdate = 0;
    private scheduledUpdate?: number;
    private audioDestination?: AudioDestinationNode;
    private boundaryInstrument?: SynthPatch;

    constructor(private chart: Chart) {
        this.unbindKeydown = addEvent(doc, 'keydown',
            function (e: KeyboardEvent): void {
                if (
                    chart && chart.sonification &&
                    (e.key === 'Esc' || e.key === 'Escape')
                ) {
                    chart.sonification.cancel();
                }
            });

        try {
            this.audioContext = new win.AudioContext();
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.audioContext.suspend();
            this.audioDestination = this.audioContext.destination;
        } catch (e) { /* ignore */ }
    }


    setMasterVolume(vol: number): void {
        if (this.timeline) {
            this.timeline.setMasterVolume(vol);
        }
    }


    setAudioDestination(audioDestination: AudioDestinationNode): void {
        this.audioDestination = audioDestination;
        this.update();
    }


    destroy(): void {
        this.unbindKeydown();
        if (this.timeline) {
            this.timeline.destroy();
            delete this.timeline;
        }
        if (this.boundaryInstrument) {
            this.boundaryInstrument.stop();
        }
        if (this.audioContext) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.audioContext.close();
        }
    }


    update(): void {
        const sOpts = this.chart.options && this.chart.options.sonification;
        if (!this.ready(this.update.bind(this)) || !sOpts) {
            return;
        }

        // Don't update too often, it gets performance intensive
        const now = Date.now(),
            updateInterval = sOpts.updateInterval;
        if (now - this.lastUpdate < updateInterval && !this.forceReady) {
            clearTimeout(this.scheduledUpdate);
            this.scheduledUpdate = setTimeout(
                this.update.bind(this), updateInterval / 2
            );
            return;
        }

        const events = sOpts.events || {};
        if (events.beforeUpdate) {
            events.beforeUpdate({ timeline: this.timeline });
        }

        this.lastUpdate = now;
        if (this.timeline) {
            this.timeline.destroy();
        }
        if (this.audioContext && this.audioDestination) {
            this.timeline = timelineFromChart(
                this.audioContext, this.audioDestination, this.chart
            );
            const sOpts = this.chart.options.sonification;
            this.timeline.setMasterVolume(
                pick(sOpts && sOpts.masterVolume, 1)
            );
        }

        if (events.afterUpdate) {
            events.afterUpdate({ timeline: this.timeline });
        }
    }


    isPlaying(): boolean {
        return !!this.timeline && this.timeline.isPlaying;
    }


    sonifyChart(resetAfter?: boolean, onEnd?: Function): void {
        if (!this.ready(this.sonifyChart.bind(this, resetAfter, onEnd))) {
            return;
        }

        if (this.timeline) {
            this.timeline.reset();
            this.timeline.play(void 0, void 0, resetAfter, onEnd);
        }
    }


    sonifySeries(series: Series, resetAfter?: boolean, onEnd?: Function): void {
        if (!this.ready(this.sonifySeries.bind(
            this, series, resetAfter, onEnd
        ))) {
            return;
        }

        if (this.timeline) {
            this.timeline.reset();
            this.timeline.play((e): boolean =>
                !!e.relatedPoint && e.relatedPoint.series === series,
            void 0, resetAfter, onEnd);
        }
    }


    sonifyPoint(point: Point, onEnd?: Function): void {
        if (!this.ready(this.sonifyPoint.bind(this, point, onEnd))) {
            return;
        }

        if (this.timeline) {
            this.timeline.reset();
            this.timeline.play((e): boolean => e.relatedPoint === point,
                void 0, void 0, onEnd);
        }
    }


    playSegment(segment: number, onEnd?: Function): void {
        if (!this.ready(this.playSegment.bind(this, segment, onEnd))) {
            return;
        }
        if (this.timeline) {
            this.timeline.playSegment(segment, onEnd);
        }
    }


    // Play points/events adjacent to current timeline cursor location
    playAdjacent(
        next: boolean,
        onEnd?: Function,
        eventFilter?: ArrayFilterCallbackFunction<globalThis.Sonification.TimelineEvent>
    ): void {
        if (!this.ready(
            this.playAdjacent.bind(this, next, onEnd, eventFilter)
        )) {
            return;
        }
        if (this.timeline) {
            const opts = this.chart.options.sonification,
                onHit = opts && opts.events && opts.events.onBoundaryHit;
            if (!this.boundaryInstrument && !onHit) {
                this.boundaryInstrument = new SynthPatch(
                    this.audioContext as AudioContext,
                    merge(InstrumentPresets.step, { masterVolume: 1.3 })
                );
                this.boundaryInstrument.startSilently();
                this.boundaryInstrument.connect(
                    this.audioDestination as AudioDestinationNode
                );
            }
            this.timeline.playAdjacent(next, onEnd, onHit || ((): void => {
                if (this.boundaryInstrument) {
                    this.boundaryInstrument.playFreqAtTime(0, 1, 300);
                }
            }), eventFilter);
        }
    }


    // Play a note
    playNote(
        instrument: string|SynthPatch.SynthPatchOptions,
        options: SonificationInstrument.ScheduledEventOptions,
        delayMs = 0
    ): void {
        if (!this.ready(this.playNote.bind(this, instrument, options))) {
            return;
        }
        const duration = options.noteDuration = options.noteDuration || 500;
        const instr = new SonificationInstrument(
            this.audioContext as AudioContext,
            this.audioDestination as AudioDestinationNode,
            {
                synthPatch: instrument,
                capabilities: {
                    filters: true,
                    tremolo: true,
                    pan: true
                }
            }
        );
        instr.scheduleEventAtTime(delayMs / 1000, options);
        setTimeout(
            (): void => instr && instr.destroy(),
            delayMs + duration + 500
        );
    }


    cancel(): void {
        if (this.timeline) {
            this.timeline.cancel();
        }
        fireEvent(this, 'cancel');
    }


    downloadMIDI(): void {
        if (!this.ready(this.downloadMIDI.bind(this))) {
            return;
        }
        if (this.timeline) {
            this.timeline.downloadMIDI();
        }
    }


    // Only continue if sonification enabled. If audioContext is
    // suspended, retry up to 20 times with a small delay.
    private ready(whenReady: () => void): boolean {
        if (
            !this.audioContext ||
            !this.audioDestination ||
            !this.chart.options ||
            this.chart.options.sonification &&
            this.chart.options.sonification.enabled === false
        ) {
            return false;
        }
        if (this.audioContext.state === 'suspended' && !this.forceReady) {
            if (this.retryContextCounter++ < 20) {
                setTimeout((): void => {
                    if (
                        this.audioContext &&
                        this.audioContext.state === 'suspended'
                    ) {
                        // eslint-disable-next-line @typescript-eslint/no-floating-promises
                        this.audioContext.resume().then(whenReady);
                    } else {
                        whenReady();
                    }
                }, 5);
            }
            return false;
        }
        this.retryContextCounter = 0;
        return true;
    }
}


namespace Sonification {

    const composedClasses: Array<Function> = [];

    /**
     * Update sonification object on chart.
     * @private
     */
    function updateSonificationEnabled(this: Chart): void {
        const sonification = this.sonification,
            sOptions = this.options && this.options.sonification;

        if (sOptions && sOptions.enabled) {
            if (sonification) {
                sonification.update();
            } else {
                this.sonification = new Sonification(this);
                this.sonification.update();
            }
        } else if (sonification) {
            sonification.destroy();
            delete this.sonification;
        }
    }


    /**
     * Destroy with chart.
     * @private
     */
    function chartOnDestroy(this: Chart): void {
        if (this && this.sonification) {
            this.sonification.destroy();
        }
    }


    /**
     * Update on render
     * @private
     */
    function chartOnRender(this: Chart): void {
        if (this.updateSonificationEnabled) {
            this.updateSonificationEnabled();
        }
    }


    /**
     * Update
     * @private
     */
    function chartOnUpdate(this: Chart, e: { options: Options }): void {
        const newOptions = e.options.sonification;
        if (newOptions) {
            merge(true, this.options.sonification, newOptions);
            chartOnRender.call(this);
        }
    }


    /**
     * Compose
     * @private
     */
    export function compose(
        ChartClass: typeof Chart,
        SeriesClass: typeof Series,
        PointClass: typeof Point
    ): void {

        // Extend chart
        if (composedClasses.indexOf(ChartClass) === -1) {
            composedClasses.push(ChartClass);
            extend(ChartClass.prototype, {
                updateSonificationEnabled,
                sonify: function (onEnd?: Function): void {
                    if (this.sonification) {
                        this.sonification.sonifyChart(false, onEnd);
                    }
                }
            });
            addEvent(ChartClass, 'destroy', chartOnDestroy);
            addEvent(ChartClass, 'render', chartOnRender);
            addEvent(ChartClass, 'update', chartOnUpdate);
        }

        // Extend series
        if (composedClasses.indexOf(SeriesClass) === -1) {
            composedClasses.push(SeriesClass);
            SeriesClass.prototype.sonify = function (onEnd?: Function): void {
                if (this.chart.sonification) {
                    this.chart.sonification.sonifySeries(this, false, onEnd);
                }
            };
        }

        // Extend points
        if (composedClasses.indexOf(PointClass) === -1) {
            composedClasses.push(PointClass);
            PointClass.prototype.sonify = function (onEnd?: Function): void {
                if (this.series.chart.sonification) {
                    this.series.chart.sonification.sonifyPoint(this, onEnd);
                }
            };
        }

        // Add items to the exporting menu
        const exportingOptions = getOptions().exporting;
        if (
            exportingOptions &&
            exportingOptions.buttons &&
            exportingOptions.buttons.contextButton.menuItems
        ) {
            exportingOptions.buttons.contextButton.menuItems.push(
                'separator',
                'downloadMIDI',
                'playAsSound'
            );
        }
    }
}


// Add default options
merge(
    true,
    defaultOptions,
    defaultSonificationOptions
);


/* *
 *
 *  Default Export
 *
 * */

export default Sonification;
