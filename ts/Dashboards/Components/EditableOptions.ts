/* *
 *
 *  (c) 2009 - 2023 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 *  Authors:
 *  - Sebastian Bochan
 *  - Wojciech Chmiel
 *  - Gøran Slettemark
 *  - Sophie Bremer
 *
 * */

import Component from './Component.js';
import U from '../../Core/Utilities.js';
const {
    merge
} = U;

namespace EditableOptions {
    export interface OptionsBindings {
        keyMap: Record<string, string>;
        typeMap: Record<string, string>;
        skipRedraw: string[]; // keys of options that should not trigger redraw
    }

    export interface getTypesType {
        type?: string;
        value?: string;
        children?: Record<string, getTypesType>
    }

    export type getOptionsType = Record<string, getTypesType>;
}

class EditableOptions {

    public static defaultBindings: EditableOptions.OptionsBindings = {
        keyMap: {
            color: 'colorPicker',
            title: 'text',
            caption: 'text',
            style: 'textarea'
        },
        typeMap: {
            'string': 'text',
            'number': 'input',
            'boolean': 'toggle'
        },
        skipRedraw: []
    };

    // Bindings of basic types to "editor components"
    public static defaultTypeMap: Record<string, string> = {
        'string': 'text',
        'number': 'input',
        'boolean': 'toggle'
    };

    public component: Component;
    public bindings: EditableOptions.OptionsBindings;

    constructor(
        component: Component,
        bindings: EditableOptions.OptionsBindings =
        EditableOptions.defaultBindings
    ) {
        this.component = component;
        this.bindings = bindings;
    }

    public getEditableOptions(): (EditableOptions.getOptionsType | undefined) {
        const { options } = this.component;
        const { keyMap, typeMap } =
            merge(EditableOptions.defaultBindings, this.bindings);

        /**
         *
         */
        function getType(
            nodeName: string,
            branch: Record<string, any>
        ): EditableOptions.getTypesType | undefined {
            const node = branch[nodeName];

            if (keyMap[nodeName]) {
                return {
                    type: keyMap[nodeName],
                    value: node ? JSON.stringify(node) : void 0
                };
            }

            const type = typeof node;
            if (typeMap[type]) {
                return {
                    type: typeMap[type],
                    value: node ? JSON.stringify(node) : void 0
                };
            }

            if (type === 'object') {
                if (Array.isArray(node)) {
                    return {
                        type: 'array',
                        value: node ? JSON.stringify(node) : void 0
                    };
                }
                // dive deeper
                const childNodes = Object.keys(node).reduce(
                    (
                        obj: Record<string, EditableOptions.getTypesType>,
                        childNodeName: string
                    ): Record<string, any> => {
                        const type = getType(childNodeName, node);
                        if (type) {
                            obj[childNodeName] = type;
                        }
                        return obj;
                    }, {});

                return { children: childNodes };
            }
        }

        const record: EditableOptions.getOptionsType = {};

        options.editableOptions
            .forEach((optionName: string): void => {
                const type = getType(optionName, options);
                if (type) {
                    record[optionName] = type;
                }
            });

        return record;
    }
}

export default EditableOptions;
