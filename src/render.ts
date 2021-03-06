import { HttpResponse } from 'fts-core'
import { ChartData, ChartOptions, ChartConfiguration } from 'chart.js'

import { getPage } from './lib/page'
import { GoogleFont } from './google-fonts'

type ChartStyle = 'normal' | 'rough'
type ChartRoughFillStyle =
  | 'hachure'
  | 'solid'
  | 'zigzag'
  | 'cross-hatch'
  | 'dots'
  | 'starburst'
  | 'dashed'
  | 'zigzag-line'

type ChartType =
  | 'line'
  | 'bar'
  | 'horizontalBar'
  | 'radar'
  | 'donut'
  | 'doughnut'
  | 'polarArea'
  | 'bubble'
  | 'pie'
  | 'scatter'
  | 'radialGauge'

/**
 * Renders the given chart as a static PNG image using [chart.js](https://www.chartjs.org).
 *
 * @param type - Required type of chart to render.
 * @param data - Required chart data following chart.js.
 * @param options - Optional chart.js configuration. We don't currently support custom JS functions.
 * @param width - Optional width of chart in pixels.
 * @param height - Optional height of chart in pixels.
 * @param deviceScaleFactor - Multiplication factor for retina displays that will multiply the `width`x`height` by this amount for the size of the output image. Defaults to retina `2`.
 *
 * Note that you should use `deviceScaleFactor` instead of the chart.js equivalent [devicePixelRatio](https://www.chartjs.org/docs/latest/general/device-pixel-ratio.html) with both handle similar roles.
 * @param fontFamily - Font family(s) to use for all chart text. Supports any font from [Google Fonts](https://fonts.google.com). Just use the full font name as you would reference it in CSS like [`Indie Flower`](https://fonts.google.com/specimen/Indie+Flower).
 * @param fontSize - Default font size (in px) for text. Does not apply to radialLinear scale point labels.
 * @param fontColor - Default font color for all text.
 * @param fontStyle - Default font style (`normal`, `italic`, `bold`). Does not apply to tooltip title or footer. Does not apply to chart title.
 * @param style - What style of chart to render. We currently support `normal` and `rough` styles, where `normal` corresponds to chart.js's default canvas rendering and `rough` uses [roughjs](https://github.com/pshihn/rough/wiki#options) to render more stylized charts.
 * @param roughness - Numerical value indicating how rough the drawing is. A rectangle with the roughness of 0 would be a perfect rectangle. Default value is 1. There is no upper limit to this value, but a value over 10 is mostly useless. (rough style only)
 * @param bowing - Numerical value indicating how curvy the lines are when drawing a sketch. A value of 0 will cause straight lines.(rough style only)
 * @param fillStyle - Fill style for chart shapes. (rough style only)
 * - `hachure` draws sketchy parallel lines with the same roughness as defined by the roughness and the bowing properties of the shape. It can be further configured using the fillWeight, hachureAngle, and hachureGap properties.
 * - `solid` is more like a conventional fill.
 * - `zigzag` draws zig-zag lines filling the shape
 * - `cross-hatch` Similar to hachure, but draws cross hatch lines (akin to two hachure fills 90 degrees from each other).
 * - `dots` Fills the shape with sketchy dots.
 * - `sunburst` Draws lines originating from the center of the shape to the edges in all directions.
 * - `dashed` Similar to hachure but the individual lines are dashed. Dashes can be configured using the dashOffset and dashGap properties.
 * - `zigzag-line` Similar to hachure but individual lines are drawn in a zig-zag fashion. The size of the zig-zag can be configured using the zigzagOffset property.
 * @param fillWeight - Numeric value representing the width of the hachure lines. Default value of the `fillWeight` is set to half the strokeWidth of that shape. (rough style only)
 * When using `dots` style, this value represents the diameter of the dots.
 * @param hachureAngle - Numerical value (in degrees) that defines the angle of the hachure lines. Default value is -41 degrees. (rough style only)
 * @param hachureGap - Numerical value that defines the average gap, in pixels, between two hachure lines. Default value of the hachureGap is set to four times the strokeWidth of that shape. (rough style only)
 * @param curveStepCount - When drawing ellipses, circles, and arcs, RoughJS approximates curveStepCount number of points to estimate the shape. Default value is 9. (rough style only)
 * @param simplification - When drawing paths using SVG path instructions, simplification can be set to simplify the shape by the specified factor. The value can be between 0 and 1. (rough style only)
 *
 * For example, a path with 100 points and a simplification value of 0.5 will estimate the shape to about 50 points. This will give more complex shapes a sketchy feel. A value of 0 (default) is treated as no simplification.
 */
export async function render(
  type: ChartType,
  data: ChartData,
  options?: ChartOptions,
  width: number = 512,
  height: number = 320,
  deviceScaleFactor: number = 2,
  fontFamily?: GoogleFont,
  fontSize: number = 12,
  fontColor: string = '#666',
  fontStyle: string = 'normal',
  style: ChartStyle = 'rough',
  roughness: number = 1,
  bowing: number = 1,
  fillStyle: ChartRoughFillStyle = 'hachure',
  fillWeight: number = 0.5,
  hachureAngle: number = -41,
  hachureGap: number = 4,
  curveStepCount: number = 9,
  simplification: number = 9
): Promise<HttpResponse> {
  if (type === 'donut') {
    // accept both types of spelling
    type = 'doughnut'
  }

  const fonts = fontFamily
    ? fontFamily.split(',').map((font) => font.trim())
    : []

  const fontHeader = fonts.length
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=${fonts
        .map((font) => font.replace(/ /g, '+'))
        .join('|')}">`
    : ''

  const fontsToLoad = fonts.map((font) => `new FontFaceObserver('${font}')`)
  const fontLoader = fontsToLoad.length
    ? `Promise.all([ ${fontsToLoad.join(
        ', '
      )} ].map((f) => f.load())).then(ready);`
    : 'ready();'

  const chart = {
    type,
    data,
    options: {
      ...options,

      // disable all animations
      animation: {
        duration: 0
      },
      hover: {
        animationDuration: 0
      },
      responsiveAnimationDuration: 0,

      // configure roughjs plugin
      plugins: {
        rough: {
          roughness,
          bowing,
          fillStyle,
          fillWeight,
          hachureAngle,
          hachureGap,
          curveStepCount,
          simplification
        }
      }
    }
  }

  console.log('>>> chart', JSON.stringify(chart))
  customizeChart(chart)
  console.log('<<< chart', JSON.stringify(chart))

  const html = `
<html>
<head>
  <meta charset="UTF-8">

  ${fontHeader}

  <script src="https://cdnjs.cloudflare.com/ajax/libs/fontfaceobserver/2.1.0/fontfaceobserver.standalone.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.9.3/Chart.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/roughjs@3.1.0/dist/rough.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-rough@0.2.0/dist/chartjs-plugin-rough.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@0.5.7/src/index.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@0.7.0/dist/chartjs-plugin-datalabels.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-chart-radial-gauge@1.0.3/build/Chart.RadialGauge.cjs.min.js"></script>

  <!-- TODO
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-piechart-outlabels@0.1.4/dist/chartjs-plugin-piechart-outlabels.min.js"></script>
  -->

  <style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: transparent;
  overflow: hidden;
}
  </style>
</head>

<body>

<canvas id="main" width="${width}" height="${height}"></canvas>

<script>
  function ready () {
    const chartConfig = ${JSON.stringify(chart)};
    const plugins = [];

    ${
      style === 'rough'
        ? `
    Chart.plugins.register(ChartRough);
    plugins.push(ChartRough);
    `
        : ''
    }

    Chart.defaults.global.defaultFontFamily = ${JSON.stringify(fontFamily)};
    Chart.defaults.global.defaultFontSize = ${JSON.stringify(fontSize)};
    Chart.defaults.global.defaultFontColor = ${JSON.stringify(fontColor)};
    Chart.defaults.global.defaultFontStyle = ${JSON.stringify(fontStyle)};

    const ctx = document.getElementById('main');
    window.chart = new Chart(ctx, { ...chartConfig, plugins });

    const div = document.createElement('div');
    div.className = 'ready';
    document.body.appendChild(div);
  }

  ${fontLoader}
</script>

</body>
</html>
`

  const page = await getPage()

  page.on('console', console.log)
  page.on('error', console.error)

  await page.setViewport({
    deviceScaleFactor,
    width,
    height
  })
  await page.setContent(html)
  await page.waitForSelector('.ready')

  const frame = page.mainFrame()
  const mainHandle = await frame.$('#main')
  const body = await mainHandle.screenshot({
    omitBackground: true
  })
  await Promise.all([mainHandle.dispose(), page.close()])

  return {
    headers: {
      'Content-Type': 'image/png'
    },
    statusCode: 200,
    body
  }
}

const DEFAULT_COLORS = {
  blue: '#4D89F9',
  green: '#00B88A',
  orange: 'rgb(255, 159, 64)',
  red: 'rgb(255, 99, 132)',
  purple: 'rgb(153, 102, 255)',
  yellow: '#fc3',
  grey: 'rgb(201, 203, 207)'
}

const ROUND_CHART_TYPES = new Set([
  'pie',
  'doughnut',
  'polarArea',
  'outlabeledPie',
  'outlabeledDoughnut'
])

const DEFAULT_COLOR_WHEEL = Object.values(DEFAULT_COLORS)

function addBackgroundColors(chart) {
  if (chart.data && chart.data.datasets && Array.isArray(chart.data.datasets)) {
    chart.data.datasets.forEach((data, dataIdx) => {
      if (!data.backgroundColor) {
        if (ROUND_CHART_TYPES.has(chart.type)) {
          // Return a color for each value
          data.backgroundColor = data.data.map(
            (_, colorIdx) =>
              DEFAULT_COLOR_WHEEL[colorIdx % DEFAULT_COLOR_WHEEL.length]
          )
        } else {
          // Return a color for each data
          data.backgroundColor =
            DEFAULT_COLOR_WHEEL[dataIdx % DEFAULT_COLOR_WHEEL.length]
        }
      }
    })
  }
}

function customizeChart(chart: ChartConfiguration) {
  if (chart.type === 'sparkline') {
    if (chart.data.datasets.length > 1) {
      throw new Error(
        '"sparkline" only supports 1 line. Use "line" chart type for multiple lines.'
      )
    }

    if (chart.data.datasets.length < 1) {
      throw new Error('"sparkline" requres 1 dataset')
    }

    chart.type = 'line'
    const dataseries = chart.data.datasets[0].data
    if (!chart.data.labels) {
      chart.data.labels = Array(dataseries.length)
    }

    chart.options.legend = chart.options.legend || { display: false }
    if (!chart.options.elements) {
      chart.options.elements = {}
    }

    chart.options.elements.line = chart.options.elements.line || {
      borderColor: '#000',
      borderWidth: 1
    }
    chart.options.elements.point = chart.options.elements.point || {
      radius: 0
    }
    if (!chart.options.scales) {
      chart.options.scales = {}
    }

    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY

    for (let i = 0; i < dataseries.length; i += 1) {
      const dp = dataseries[i] as number
      min = Math.min(min, dp)
      max = Math.max(max, dp)
    }

    chart.options.scales.xAxes = chart.options.scales.xAxes || [
      { display: false }
    ]

    chart.options.scales.yAxes = chart.options.scales.yAxes || [
      {
        display: false,
        ticks: {
          // Offset the min and max slightly so that pixels aren't shaved off
          // under certain circumstances.
          min: min - min * 0.05,
          max: max + max * 0.05
        }
      }
    ]
  } else if (
    chart.type === 'bar' ||
    chart.type === 'line' ||
    chart.type === 'scatter' ||
    chart.type === 'bubble'
  ) {
    if (!chart.options.scales) {
      chart.options.scales = {
        yAxes: [
          {
            ticks: {
              beginAtZero: true
            }
          }
        ]
      }
    }

    addBackgroundColors(chart)
  } else if (chart.type === 'radar') {
    addBackgroundColors(chart)
  } else if (ROUND_CHART_TYPES.has(chart.type)) {
    addBackgroundColors(chart)
  } else if (chart.type === 'scatter') {
    addBackgroundColors(chart)
  } else if (chart.type === 'bubble') {
    addBackgroundColors(chart)
  }

  if (chart.type === 'line') {
    chart.data.datasets.forEach((dataset) => {
      const data = dataset
      // Make line charts straight lines by default.
      data.lineTension = data.lineTension || 0
    })
  }

  chart.options.plugins = chart.options.plugins || {}
  let usingDataLabelsDefaults = false

  if (!chart.options.plugins.datalabels) {
    usingDataLabelsDefaults = true
    chart.options.plugins.datalabels = {}

    if (chart.type === 'pie' || chart.type === 'doughnut') {
      chart.options.plugins.datalabels = {
        display: true
      }
    } else {
      chart.options.plugins.datalabels = {
        display: false
      }
    }
  }

  /*
  // TODO
  if (ROUND_CHART_TYPES.has(chart.type) || chart.type === 'radialGauge') {
    let userSpecifiedOutlabels = false

    chart.data.datasets.forEach((dataset) => {
      if (
        dataset.outlabels ||
        (chart.options.plugins && chart.options.plugins.outlabels)
      ) {
        userSpecifiedOutlabels = true
      } else {
        // Disable outlabels by default.
        dataset.outlabels = { display: false }
      }
    })

    if (userSpecifiedOutlabels && usingDataLabelsDefaults) {
      // If outlabels are enabled, disable datalabels by default.
      chart.options.plugins.datalabels = {
        display: false
      }
    }
  }
  */
}
