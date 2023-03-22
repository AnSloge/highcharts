/**
 * @license Highcharts Dashboards v0.0.2 (@product.date@)
 * @module highsoft/dashboard
 * @requires window
 *
 * (c) 2009-2023 Highsoft AS
 *
 * License: www.highcharts.com/license
 */

'use strict';

/* *
 *
 *  Imports
 *
 * */

import CSVConnector from '../Data/Connectors/CSVConnector.js';
import Board from '../Dashboards/Board.js';
import Component from '../Dashboards/Components/Component.js';
import DataPool from '../Data/DataPool.js';
import DataCursor from '../Data/DataCursor.js';
import DataTable from '../Data/DataTable.js';
import Globals from '../Dashboards/Globals.js';
import GoogleSheetsConnector from '../Data/Connectors/GoogleSheetsConnector.js';
import GroupModifier from '../Data/Modifiers/GroupModifier.js';
import HTMLTableConnector from '../Data/Connectors/HTMLTableConnector.js';
import PluginHandler from '../Dashboards/PluginHandler.js';
import RangeModifier from '../Data/Modifiers/RangeModifier.js';
import Sync from '../Dashboards/Components/Sync/Sync.js';
import Utilities from '../Dashboards/Utilities.js';

/* *
 *
 *  Declarations
 *
 * */

declare global {
    interface Window {
        Dashboards: typeof D;
        Highcharts: typeof Highcharts & { Dashboard: typeof D };
    }
    let Dashboards: typeof D;
}

/* *
 *
 *  Namespace
 *
 * */

const D = {
    ...Globals,
    ...Utilities,
    Board,
    board: Board.board,
    Component,
    CSVConnector,
    DataCursor,
    DataPool,
    DataTable,
    GoogleSheetsConnector,
    GroupModifier,
    HTMLTableConnector,
    PluginHandler,
    RangeModifier,
    Sync,
    _modules: (typeof _modules === 'undefined' ? {} : _modules)
};

/* *
 *
 *  Classic Exports
 *
 * */

if (!D.win.Dashboards) {
    D.win.Dashboards = D;
}

export default D;
