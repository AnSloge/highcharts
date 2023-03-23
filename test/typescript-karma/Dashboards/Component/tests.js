//@ts-check
import Highcharts from '/base/code/es-modules/masters/highcharts.src.js';
import HighchartsComponent from '/base/code/es-modules/Extensions/DashboardPlugins/HighchartsComponent.js';
import HTMLComponent from '/base/code/es-modules/Dashboards/Components/HTMLComponent.js';
import Component from '/base/code/es-modules/Dashboards/Components/Component.js';
import CSVConnector from '/base/code/es-modules/Data/Connectors/CSVConnector.js';

HighchartsComponent.charter = Highcharts;

const { test, only,skip } = QUnit;

/** @type {Component.Event['type'][]} */
const eventTypes = [
    'load',
    'afterLoad',
    'beforeRender',
    'afterRender',
    'redraw',
    'afterRedraw',
    'tableChanged',
    'connectorAttached',
    'update',
    'afterUpdate',
    'message'
];

/** @type {Component.Event['type'][]} */
const registeredEvents = [];

/** @param {Component.Event} e */
function registerEvent(e) {
    registeredEvents.push(e.type);
}
/**
 * @param {any[]} [array]
 */
function emptyArray(array) {
    while (array.length) {
        array.pop();
    }
}
/** @param {HighchartsComponent | HTMLComponent} component */
function registerEvents(component) {
    eventTypes.forEach(eventType => component.on(eventType, registerEvent))
}


test('HighchartsComponent options update', function (assert) {
    const parentElement = document.getElementById('container');
    const connector = new CSVConnector(void 0, {
        csv: '1,2,3',
        firstRowAsNames: false
    });

    connector.load();

    const componentOptions = {
        parentElement: 'container',
        chartOptions: {
            title : {
                text: null
            }
        }
    };

    const component = new HighchartsComponent(
        componentOptions
    );

    registerEvents(component);

    component.load()
    component.render();

    const eventsAfterRender = [
          "load",
          "afterLoad",
          "beforeRender",
          "afterRender"
    ];

    // TODO: update with options that should not force a redraw
    // Redraw event should not fire

    component.update({
        ...componentOptions,
        chartOptions: {
            title : {
                text: 'Hello World'
            }
        }
    });

    const expectedEvents = eventsAfterRender;
    expectedEvents.push(
        'update', 
        'update', // is triggered by the chart updating
        'afterUpdate'
    );
    assert.deepEqual(registeredEvents, expectedEvents ,'after unforced update');

    // TODO: update with an option that should force a redraw
    // Redraw event should fire
    component.update({
        ...componentOptions,
        title: 'This should fire a redraw'
    });

    expectedEvents.push(
          "update",
          "redraw",
          "beforeRender",
          "load",
          "afterLoad",
          "afterRender",
          "update",
          "afterUpdate"

    );
    assert.deepEqual(registeredEvents, expectedEvents, 'events after forced update');

    Component.removeInstance(component);
    emptyArray(registeredEvents);
    emptyArray(expectedEvents);

});

test('HighchartsComponent events', function (assert) {
    const parentElement = document.getElementById('container');
    const connector = new CSVConnector(void 0, {
        csv: '1,2,3',
        firstRowAsNames: false
    });

    connector.load();

    const component = new HighchartsComponent({
        parentElement: 'container'
    });


    registerEvents(component);

    component.load()
    component.render();
    const expectedEvents = [
        'load', 
        'afterLoad', 
        'beforeRender', 
        'afterRender'
    ];

    assert.deepEqual(registeredEvents, expectedEvents);

    component.setConnector(connector)
    expectedEvents.push('connectorAttached');
    assert.deepEqual(
        registeredEvents,
        expectedEvents,
        'Attaching a connector should fire an evnet'
    );

    emptyArray(registeredEvents);
    emptyArray(expectedEvents);

    // With a connector set in constructor
    const componentWithConnector = new HighchartsComponent({
        parentElement,
        connector
    });
    registerEvents(componentWithConnector);

    componentWithConnector.load();
    componentWithConnector.render();

    expectedEvents.push('load', 'connectorAttached', 'afterLoad', 'beforeRender', 'afterRender');
    assert.deepEqual(
        registeredEvents,
        expectedEvents,
        'If connector is given in options, it will be attached during load'
    );

    emptyArray(registeredEvents);
    emptyArray(expectedEvents);

    // Table updates
    // This test doesn't work as there's a timeout going on

    // connector.table.getRow(0).insertCell('test', 0);
    // connector.table.insertRow(connector.table.getRow(0))
    // expectedEvents.push('tableChanged', 'xxx');
    //
    // assert.deepEqual(
    //     registeredEvents,
    //     expectedEvents
    // );


    // emptyArray(registeredEvents);
    // emptyArray(expectedEvents);

    // Redraws -> should also fire render
    component.redraw();
    expectedEvents.push(
      'redraw', 
      'beforeRender', 
      'load', 
      'afterLoad', 
      'afterRender'
    );


    assert.deepEqual(
        registeredEvents,
        expectedEvents
    );

    emptyArray(registeredEvents);
    emptyArray(expectedEvents);

    // Message
    expectedEvents.push('message');

    // This should fire a 'message' event to all the other components
    // We should expect N - 1 'message' events (in this case 1)

    component.postMessage('hello');

    assert.deepEqual(
        registeredEvents,
        expectedEvents
    );

    // This should bounce a message back and forth
    component.postMessage({
        callback: function () {
            this.postMessage('hello');
        }
    });

    expectedEvents.push('message', 'message');

    assert.deepEqual(
        registeredEvents,
        expectedEvents
    );

    emptyArray(registeredEvents);
    emptyArray(expectedEvents);

    Component.removeInstance(component);
    Component.removeInstance(componentWithConnector);

});


test('HTMLComponent events', function (assert) {
    const parentElement = document.createElement('div');
    const connector = new CSVConnector(undefined, {
        csv: '1,2,3',
        firstRowAsNames: false
    });

    connector.load();

    const component = new HTMLComponent({
        parentElement
    });


    registerEvents(component);

    component.load();
    component.render();
    const expectedEvents = ['load', 'afterLoad', 'beforeRender', 'afterRender']
    assert.deepEqual(registeredEvents, expectedEvents);

    component.setConnector(connector);
    expectedEvents.push('connectorAttached');
    assert.deepEqual(
        registeredEvents,
        expectedEvents,
        'Attaching a connector should fire an event'
    );

    emptyArray(registeredEvents);
    emptyArray(expectedEvents);

    // With a connector set in constructor
    const componentWithConnector = new HTMLComponent({
        parentElement,
        connector: connector
    });
    registerEvents(componentWithConnector);

    componentWithConnector.load();
    componentWithConnector.render();

    expectedEvents.push('load', 'connectorAttached', 'afterLoad', 'beforeRender', 'afterRender');
    assert.deepEqual(
        registeredEvents,
        expectedEvents,
        'If connector is given in options, it will be attached during load'
    );

    emptyArray(registeredEvents);
    emptyArray(expectedEvents);

    // Table updates
    // This test doesn't work as there's a timeout going on

    // connector.table.getRow(0).insertCell('test', 0);
    // connector.table.insertRow(connector.table.getRow(0))
    // expectedEvents.push('tableChanged', 'xxx');
    //
    // assert.deepEqual(
    //     registeredEvents,
    //     expectedEvents
    // );


    // emptyArray(registeredEvents);
    // emptyArray(expectedEvents);

    // Redraws -> should also fire render
    component.redraw();
    expectedEvents.push(
       'redraw', 
       'beforeRender', 
       'load', 
       'afterLoad', 
       'afterRender',
       'afterRedraw'
    );



    assert.deepEqual(
        registeredEvents,
        expectedEvents
    );

    emptyArray(registeredEvents);
    emptyArray(expectedEvents);

    // Message
    expectedEvents.push('message');

    // This should fire a 'message' event to all the other components
    // We should expect N - 1 'message' events (in this case 1)

    component.postMessage('hello');

    assert.deepEqual(
        registeredEvents,
        expectedEvents
    );

    // This should bounce a message back and forth
    component.postMessage({
        callback: function () {
            this.postMessage('hello');
        }
    });

    expectedEvents.push('message', 'message');
    assert.deepEqual(
        registeredEvents,
        expectedEvents
    );

    emptyArray(registeredEvents);
    emptyArray(expectedEvents);

    Component.removeInstance(component);
    Component.removeInstance(componentWithConnector);
});

test('component resizing', function(assert) {

    const parent = document.createElement('div');
    parent.id = 'test';

    document.getElementById('container').appendChild(parent);

    const component = new HTMLComponent({
        parentElement: parent
    }).render()
    assert.deepEqual(
        {
            width: component.element.style.width,
            height: component.element.style.height
        },
        {
            width: "",
            height: ""
        },
        'Component with no dimensional options should have no internal styles set'
    );

    component.resize(200)
    assert.deepEqual(
        {
            width: component.element.style.width,
            height: component.element.style.height
        },
        {
            width: '200px',
            height: ""
        },
        'Should be able to update just the width'
    );

    component.resize(undefined, 300)

    assert.deepEqual(
        {
            width: component.element.style.width,
            height: component.element.style.height
        },
        {
            width: '200px',
            height: '300px'
        },
        'Should be able to update just the height. Width should stay the same.'
    );

    parent.style.width = '1000px';
    parent.style.height = '200px';
    component.resize('100%', '100%');
    assert.deepEqual(
        {
            width: component.dimensions.width,
            height: component.dimensions.height
        },
        {
            width: 1000,
            height: 200
        },
        'Should be able to update just the height'
    );

    component.destroy();

    // const widthComponent = new HTMLComponent({
    //     dimensions: {
    //         width: '100'
    //     }
    // }).render();
    // assert.strictEqual(widthComponent.dimensions.width, 100)
    // assert.strictEqual(widthComponent.dimensions.height, null)

    // widthComponent.destroy()

   //  const heightComponent = new HTMLComponent({
   //      dimensions: {
   //          height: '100'
   //      }
   //  }).render();
   //  assert.strictEqual(heightComponent.dimensions.width, null)
   //  assert.strictEqual(heightComponent.dimensions.height, 100)
   //
   //  heightComponent.destroy()
   //
   //  const emptyDimensions = new HTMLComponent({
   //      dimensions: {}
   // }).render();
   //  assert.strictEqual(emptyDimensions.dimensions.width, null)
   //  assert.strictEqual(emptyDimensions.element.style.height, "")
   //
   //  emptyDimensions.destroy();
   //
   //  const percentageDimensions = new HTMLComponent({
   //      parentElement: parent,
   //      dimensions: {
   //          width: '50%',
   //          height: '50%'
   //      }
   //  }).render();
   //
   //  let rect = percentageDimensions.element.getBoundingClientRect()
   //  assert.strictEqual(rect.width, parent.scrollWidth / 2)
   //  assert.strictEqual(rect.height, parent.scrollHeight / 2 )
    //
    //
    // // With padding
    // percentageDimensions.element.style.padding = '5px';
    // percentageDimensions.resize('50%', '50%')
    //
    // rect = percentageDimensions.element.getBoundingClientRect()
    // assert.strictEqual(rect.width, parent.scrollWidth / 2)
    // assert.strictEqual(rect.height, parent.scrollHeight / 2)
    //
    // percentageDimensions.destroy();


});

test('HighchartsComponent resizing', function(assert) {
    const parent = document.createElement('div');
    parent.id = 'test';
    parent.style.width = '500px';
    document.getElementById('container').appendChild(parent);

    const component = new HighchartsComponent({
        parentElement: parent,
        chartOptions: {
            chart: {}
        },
        dimensions: {
            height: '100%',
            width: '100%'
        }
    }).render();

    const { width, height } = component.element.style
    assert.ok(true)
});

test('Chart update in HighchartsComponent', function(assert) {
    const parent = document.createElement('div');
    parent.id = 'test';
    parent.style.width = '500px';
    document.getElementById('container').appendChild(parent);

    const component = new HighchartsComponent({
        parentElement: parent,
        chartOptions: {
            title: {
                text: 'test'
            },
            series: [{
                data: [1, 2, 3]
            }]
        }
    }).render();

    component.chart.update({
        title: {
            text: 'updated'
        }
    });

    assert.strictEqual(component.options.chartOptions.title.text, 'updated');
});

test('toJSON', function(assert) {
    const container = document.createElement('div');
    container.id = 'container';

    const connector = new CSVConnector();
    const component = new HighchartsComponent({
        connector,
        parentElement: container,
        chartOptions: {
            chart: {},
            series: [{
                data: [1, 2, 3, 5, 15, 1, 5, 15, 1]
            }]
        }
    });

    component.render()
    const json = component.toJSON()
    const clone = HighchartsComponent.fromJSON(json);
    clone.render();

    assert.deepEqual(json, clone.toJSON())
});
