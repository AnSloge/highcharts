/* *
 *
 *  (c) 2020-2022 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 *  Authors:
 *  - Wojciech Chmiel
 *  - Sophie Bremer
 *
 * */

'use strict';

/* *
 *
 *  Imports
 *
 * */

import DataModifier from './DataModifier.js';
import DataTable from '../DataTable.js';
import U from '../../Core/Utilities.js';
const { merge } = U;

/* *
 *
 *  Class
 *
 * */

/**
 * Inverts columns and rows in a table.
 *
 * @private
 */
class InvertModifier extends DataModifier {

    /* *
     *
     *  Static Properties
     *
     * */

    /**
     * Default options for the invert modifier.
     */
    public static readonly defaultOptions: InvertModifier.Options = {
        modifier: 'InvertModifier'
    };

    /* *
     *
     *  Constructor
     *
     * */

    /**
     * Constructs an instance of the invert modifier.
     *
     * @param {InvertModifier.Options} [options]
     * Options to configure the invert modifier.
     */
    public constructor(options?: DeepPartial<InvertModifier.Options>) {
        super();

        this.options = merge(InvertModifier.defaultOptions, options);
    }

    /* *
     *
     *  Properties
     *
     * */

    /**
     * Options of the invert modifier.
     */
    public options: InvertModifier.Options;

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Applies partial modifications of a cell change to the property `modified`
     * of the given modified table.
     *
     * @param {Highcharts.DataTable} table
     * Modified table.
     *
     * @param {string} columnName
     * Column name of changed cell.
     *
     * @param {number|undefined} rowIndex
     * Row index of changed cell.
     *
     * @param {Highcharts.DataTableCellType} cellValue
     * Changed cell value.
     *
     * @return {Highcharts.DataTable}
     * Table with `modified` property as a reference.
     */
    public modifyCell<T extends DataTable>(
        table: T,
        columnName: string,
        rowIndex: number,
        cellValue: DataTable.CellType
    ): T {
        const modified = table.modified,
            modifiedRowIndex = modified.getRowIndexBy(
                'columnNames',
                columnName
            );

        if (typeof modifiedRowIndex === 'undefined') {
            modified.setColumns(
                this.modifyTable(table.clone()).getColumns(),
                void 0
            );
        } else {
            modified.setCell(
                `${rowIndex}`,
                modifiedRowIndex,
                cellValue
            );
        }

        return table;
    }

    /**
     * Applies partial modifications of column changes to the property
     * `modified` of the given table.
     *
     * @param {Highcharts.DataTable} table
     * Modified table.
     *
     * @param {Highcharts.DataTableColumnCollection} columns
     * Changed columns as a collection, where the keys are the column names.
     *
     * @param {number} [rowIndex=0]
     * Index of the first changed row.
     *
     * @return {Highcharts.DataTable}
     * Table with `modified` property as a reference.
     */
    public modifyColumns<T extends DataTable>(
        table: T,
        columns: DataTable.ColumnCollection,
        rowIndex: number
    ): T {
        const modified = table.modified,
            modifiedColumnNames = (modified.getColumn('columnNames') || []);

        let columnNames = table.getColumnNames(),
            reset = (table.getRowCount() !== modifiedColumnNames.length);

        if (!reset) {
            for (let i = 0, iEnd = columnNames.length; i < iEnd; ++i) {
                if (columnNames[i] !== modifiedColumnNames[i]) {
                    reset = true;
                    break;
                }
            }
        }

        if (reset) {
            return this.modifyTable(table);
        }

        columnNames = Object.keys(columns);

        for (
            let i = 0,
                iEnd = columnNames.length,
                column: DataTable.Column,
                columnName: string,
                modifiedRowIndex: (number|undefined);
            i < iEnd;
            ++i
        ) {
            columnName = columnNames[i];
            column = columns[columnName];
            modifiedRowIndex = (
                modified.getRowIndexBy('columnNames', columnName) ||
                modified.getRowCount()
            );

            for (
                let j = 0,
                    j2 = rowIndex,
                    jEnd = column.length;
                j < jEnd;
                ++j, ++j2
            ) {
                modified.setCell(
                    `${j2}`,
                    modifiedRowIndex,
                    column[j]
                );
            }
        }

        return table;
    }

    /**
     * Applies partial modifications of row changes to the property `modified`
     * of the given table.
     *
     * @param {Highcharts.DataTable} table
     * Modified table.
     *
     * @param {Array<(Highcharts.DataTableRow|Highcharts.DataTableRowObject)>} rows
     * Changed rows.
     *
     * @param {number} [rowIndex]
     * Index of the first changed row.
     *
     * @return {Highcharts.DataTable}
     * Table with `modified` property as a reference.
     */
    public modifyRows<T extends DataTable>(
        table: T,
        rows: Array<(DataTable.Row|DataTable.RowObject)>,
        rowIndex: number
    ): T {
        const columnNames = table.getColumnNames(),
            modified = table.modified,
            modifiedColumnNames = (modified.getColumn('columnNames') || []);

        let reset = (table.getRowCount() !== modifiedColumnNames.length);

        if (!reset) {
            for (let i = 0, iEnd = columnNames.length; i < iEnd; ++i) {
                if (columnNames[i] !== modifiedColumnNames[i]) {
                    reset = true;
                    break;
                }
            }
        }

        if (reset) {
            return this.modifyTable(table);
        }

        for (
            let i = 0,
                i2 = rowIndex,
                iEnd = rows.length,
                row: (DataTable.Row|DataTable.RowObject);
            i < iEnd;
            ++i, ++i2
        ) {
            row = rows[i];

            if (row instanceof Array) {
                modified.setColumn(`${i2}`, row);
            } else {
                for (let j = 0, jEnd = columnNames.length; j < jEnd; ++j) {
                    modified.setCell(
                        `${i2}`,
                        j,
                        row[columnNames[j]]
                    );
                }
            }
        }

        return table;
    }

    /**
     * Inverts rows and columns in the table.
     *
     * @param {DataTable} table
     * Table to invert.
     *
     * @return {DataTable}
     * Table with inverted `modified` property as a reference.
     */
    public modifyTable<T extends DataTable>(table: T): T {
        const modifier = this;

        const modified = table.modified;

        if (table.hasColumns(['columnNames'])) { // inverted table
            const columnNames: Array<string> = (
                    (table.deleteColumns(['columnNames']) || {})
                        .columnNames || []
                ).map(
                    (column): string => `${column}`
                ),
                columns: DataTable.ColumnCollection = {};

            for (
                let i = 0,
                    iEnd = table.getRowCount(),
                    row: (DataTable.Row|undefined);
                i < iEnd;
                ++i
            ) {
                row = table.getRow(i);
                if (row) {
                    columns[columnNames[i]] = row;
                }
            }

            modified.deleteColumns();
            modified.setColumns(columns);

        } else { // regular table
            const columns: DataTable.ColumnCollection = {};

            for (
                let i = 0,
                    iEnd = table.getRowCount(),
                    row: (DataTable.Row|undefined);
                i < iEnd;
                ++i
            ) {
                row = table.getRow(i);
                if (row) {
                    columns[`${i}`] = row;
                }
            }
            columns.columnNames = table.getColumnNames();

            modified.deleteColumns();
            modified.setColumns(columns);
        }

        return table;
    }

}

/* *
 *
 *  Class Namespace
 *
 * */

/**
 * Additionally provided types for modifier options, and JSON conversion.
 */
namespace InvertModifier {

    /**
     * Options to configure the modifier.
     */
    export interface Options extends DataModifier.Options {
        // nothing here yet
    }

}

/* *
 *
 *  Register
 *
 * */

DataModifier.addModifier(InvertModifier);

declare module './ModifierType' {
    interface ModifierTypeRegistry {
        Invert: typeof InvertModifier;
    }
}

/* *
 *
 *  Export
 *
 * */

export default InvertModifier;
