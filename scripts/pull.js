/* eslint-disable no-console */ import fs from 'node:fs' import path from 'node:path' import https from 'node:https'

const TOKEN = process.env.SMARTSHEET_TOKEN const SHEET_ID = process.env.SHEET_ID if (!TOKEN || !SHEET_ID) { console.error('Missing SMARTSHEET_TOKEN or SHEET_ID env vars.') process.exit(1) }

const apiGet = (url) => new Promise((resolve, reject) => { const req = https.request( url, { method: 'GET', headers: { Authorization: Bearer ${TOKEN}, 'Content-Type': 'application/json', }, }, (res) => { let data = '' res.on('data', (chunk) => (data += chunk)) res.on('end', () => { if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) { resolve(JSON.parse(data)) } else { reject(new Error(HTTP ${res.statusCode}: ${data})) } }) } ) req.on('error', reject) req.end() })

function safe(val) { if (val == null) return '' if (typeof val === 'string') return val.replace(/[\n\r,]/g, ' ').trim() return String(val) }

function toNumber(val) { if (val == null || val === '') return '' const n = Number(val) return Number.isFinite(n) ? n : '' }

function ensureDirs() { fs.mkdirSync('data', { recursive: true }) fs.mkdirSync('data/measurements', { recursive: true }) }

function writeCSV(headers, rows, csvPath) { const headerLine = headers.join(',') const lines = rows.map((r) => headers.map((h) => safe(r[h])).join(',')) fs.writeFileSync(csvPath, [headerLine, ...lines].join('\n') + '\n', 'utf8') }

function writeJSONPerRow(rows) { for (const r of rows) { const ts = r.timestamp || 'unknown' const eid = r.equipmentId || 'unknown' const fname = ${eid}-${String(ts).replace(/[: ]/g, '_')}.json const outPath = path.join('data', 'measurements', fname) fs.writeFileSync(outPath, JSON.stringify(r, null, 2), 'utf8') } }

function mapRow(cells, columns) { const obj = {} for (const cell of cells) { const col = columns.find((c) => c.id === cell.columnId) if (!col) continue const name = col.title obj[name] = cell.displayValue ?? cell.value ?? '' } // Normalize to our field names (match your Smartsheet column titles) return { equipmentId: obj['equipmentId'] || obj['EquipmentId'] || obj['Equipment ID'] || '', pumpModel: obj['pumpModel'] || obj['PumpModel'] || obj['Pump Model'] || '', driveType: obj['driveType'] || obj['DriveType'] || obj['Drive Type'] || '', speedRPM: toNumber(obj['speedRPM'] || obj['SpeedRPM'] || obj['Speed (RPM)']), flow_m3h: toNumber(obj['flow_m3h'] || obj['Flow_m3h'] || obj['Flow (m3/h)']), suctionGauge_kPa: toNumber(obj['suctionGauge_kPa'] || obj['SuctionGauge_kPa'] || obj['Suction gauge (kPa)']), dischargeGauge_kPa: toNumber(obj['dischargeGauge_kPa'] || obj['DischargeGauge_kPa'] || obj['Discharge gauge (kPa)']), temperatureC: toNumber(obj['temperatureC'] || obj['TemperatureC'] || obj['Temperature (C)']), elevationDiff_m: toNumber(obj['elevationDiff_m'] || obj['ElevationDiff_m'] || obj['Elevation diff (m)']), voltage_V: toNumber(obj['voltage_V'] || obj['Voltage_V'] || obj['Voltage (V)']), current_A: toNumber(obj['current_A'] || obj['Current_A'] || obj['Current (A)']), timestamp: obj['Created'] || obj['created'] || obj['Timestamp'] || '', } }

function sortRowsByTime(rows) { return rows.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) }

async function main() { ensureDirs() const url = https://api.smartsheet.com/2.0/sheets/${SHEET_ID} const sheet = await apiGet(url)

const columns = sheet.columns || [] const rowsRaw = sheet.rows || [] const mapped = rowsRaw.map((r) => mapRow(r.cells || [], columns)) const rows = sortRowsByTime(mapped)

const headers = [ 'timestamp', 'equipmentId', 'pumpModel', 'driveType', 'speedRPM', 'flow_m3h', 'suctionGauge_kPa', 'dischargeGauge_kPa', 'temperatureC', 'elevationDiff_m', 'voltage_V', 'current_A', ] writeCSV(headers, rows, path.join('data', 'measurements.csv')) writeJSONPerRow(rows) console.log(Wrote ${rows.length} rows to data/measurements.csv and JSON files.) }

main().catch((e) => { console.error(e) process.exit(1) })
