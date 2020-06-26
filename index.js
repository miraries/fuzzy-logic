const csv = require('csv-parser')
const fs = require('fs')

const [SETOSA, VERSICOLOR, VIRGINICA] = [1, 2, 3]

const readData = function() {
    return new Promise((resolve) => {
        const results = []

        fs.createReadStream('iris.csv')
            .pipe(csv({
                separator: ' ',
            }))
            .on('data', (data) => results.push(data))
            .on('end', () => {
                const parsed = results.map(x => Object.values(x).map(y => parseFloat(y)))
                resolve(parsed)
            });
    })
}

const normalizeCell = (value, min, max) => (value - min) / (max - min);

const normalizeData = function(data) {
    const agg = (fun) => [0, 1, 2, 3].map(key => fun(...data.map(row => row[key])))
    const maxes = agg(Math.max)
    const mins = agg(Math.min)

    console.table({ maxes, mins })

    return data.map(row => row.map((cell, index) => index < 4 ? normalizeCell(cell, mins[index], maxes[index]) : cell))
}

const membershipRow = function(row) {
    const values = row.slice(0, -1)

    return values.map(v => {
        if (v < 0.6) return [
            1 - (v / 0.6),
            v / 0.6,
            0.0
        ]
        else if (v > 0.6) return [
            0.0,
            (1 - v) / 0.4, //  (1 + (0.6 / 0.4)) - (v / 0.4)
            1 - ((1 - v) / 0.4) //  v / 0.4 - ((1 / 0.4) - 1)
        ]
        else return [
            0.0,
            1.0,
            0.0
        ]
    })
}

const membershipData = data => data.map(row => [...membershipRow(row), row[4]])
const ruleMatchingData = data => data.map(row => ruleMatchingRow(row))

const ruleMatchingRow = function(row) {
    const [short, medium, long] = [0, 1, 2]
    const [x1, x2, x3, x4, irisReal] = row

    const and = (...args) => Math.min(...args)
    const or = (...args) => Math.max(...args)

    const ruleMatchings = [VERSICOLOR, SETOSA, VIRGINICA, VERSICOLOR]

    const rule1 = and(
        or(x1[short], x1[long]),
        or(x2[medium], x2[long]),
        or(x3[medium], x3[long]),
        x4[medium]
    )

    const rule2 = and(
        or(x3[short], x3[medium]),
        x4[short]
    )

    const rule3 = and(
        or(x2[short], x2[medium]),
        x3[long],
        x4[long]
    )

    const rule4 = and(
        x1[medium],
        or(x2[short], x2[medium]),
        x3[short],
        x4[long]
    )

    const results = [rule1, rule2, rule3, rule4]
    const irisGuess = ruleMatchings[results.indexOf(Math.max(...results))]

    return [irisGuess, irisReal]
}

const printSummary = function(results) {
    const total = results.length
    const matched = results.filter(([guess, real]) => guess === real).length

    console.table({ total, matched, '%': Number((matched / total * 100).toFixed(2)) })
}

const step = () => console.log('\n-------------------------\n')

;(async function() {
    console.log('Reading data')
    const rawData = await readData()

    step()

    console.log('Normalizing data')
    const data = normalizeData(rawData)
    console.log('\nSample:')
    console.table(data[0])

    step()

    console.log('Fuzzification - applying membership function')
    const fuzzifiedData = membershipData(data)
    console.log('\nSample:')
    console.table(fuzzifiedData[0])

    step()

    console.log('Rule matching')
    const results = ruleMatchingData(fuzzifiedData)
    console.log('\nSample:')
    console.table(results[0])

    step()

    printSummary(results)
})()