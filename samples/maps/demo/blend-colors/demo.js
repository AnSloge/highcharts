(async () => {

    const topology = await fetch(
        'https://code.highcharts.com/mapdata/custom/world.topo.json'
    ).then(response => response.json());

    Highcharts.getJSON('https://cdn.jsdelivr.net/gh/highcharts/highcharts@v7.0.0/samples/data/world-population.json', function (data) {

        Highcharts.mapChart('container', {
            chart: {
                borderWidth: 1,
                map: topology
            },

            title: {
                text: 'World population 2013 by country'
            },

            subtitle: {
                text: 'Demo of Highcharts map with bubbles'
            },

            accessibility: {
                description: 'We see how China and India by far are the countries with the largest population.'
            },

            legend: {
                enabled: false
            },

            mapNavigation: {
                enabled: true,
                buttonOptions: {
                    verticalAlign: 'bottom'
                }
            },

            plotOptions: {
                mapbubble: {
                    minSize: 20,
                    maxSize: 200,
                    opacity: 0.3
                }
            },

            series: [{
                name: 'Countries',
                color: '#E0E0E0',
                enableMouseTracking: false
            }, {
                type: 'mapbubble',
                name: 'Population 2016',
                joinBy: ['iso-a2', 'code'],
                data: data,
                tooltip: {
                    pointFormat: '{point.properties.hc-a2}: {point.z} thousands'
                },
                blendColors: [
                    '#ff0000',
                    '#ffff00',
                    '#00ff00',
                    '#00ffff',
                    '#0000ff'
                ]
            }]
        });
    });

})();
