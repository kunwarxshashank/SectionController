import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectTrainData } from '@/store/slices/stationSlice';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';

// Time-distance diagram fed by real train data from stationSlice (with fallbacks).
const TimeDistanceGraph = () => {
    const trainData = useSelector(selectTrainData);

    const palette = ['#EA7317', '#22c55e', '#3b82f6', '#a855f7', '#e11d48'];
    const fallbackStations = [
        { name: 'Alpha Jn', km: 0 },
        { name: 'Beta Rd', km: 12 },
        { name: 'Gamma Halt', km: 27 },
        { name: 'Delta Yard', km: 45 },
        { name: 'Omega Jn', km: 63 },
    ];

    const fallbackSeries = [
        {
            id: 'EXP-12345',
            color: palette[0],
            points: [
                { station: 'Alpha Jn', km: 0, time: '08:00' },
                { station: 'Beta Rd', km: 12, time: '08:10' },
                { station: 'Gamma Halt', km: 27, time: '08:26' },
                { station: 'Delta Yard', km: 45, time: '08:45' },
                { station: 'Omega Jn', km: 63, time: '09:05' },
            ],
        },
        {
            id: 'PAX-22692',
            color: palette[1],
            points: [
                { station: 'Omega Jn', km: 63, time: '08:05' },
                { station: 'Delta Yard', km: 45, time: '08:20' },
                { station: 'Gamma Halt', km: 27, time: '08:38' },
                { station: 'Beta Rd', km: 12, time: '08:55' },
                { station: 'Alpha Jn', km: 0, time: '09:12' },
            ],
        },
        {
            id: 'FRT-77110',
            color: palette[2],
            points: [
                { station: 'Alpha Jn', km: 0, time: '08:15' },
                { station: 'Gamma Halt', km: 27, time: '08:50' },
                { station: 'Omega Jn', km: 63, time: '09:40' },
            ],
        },
    ];

    const toMinutes = (hhmm) => {
        if (!hhmm) return null;
        const [h, m] = hhmm.split(':').map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) return null;
        return h * 60 + m;
    };

    const normalizeTime = (timeStr) => {
        if (!timeStr) return null;
        const [hRaw, mRaw = '0'] = timeStr.split(':');
        const h = String(hRaw).padStart(2, '0');
        const m = String(mRaw).padStart(2, '0').slice(0, 2);
        return `${h}:${m}`;
    };

    // Build time-distance series from store train data; fallback when missing.
    const { stations, series } = useMemo(() => {
        if (!trainData || trainData.length === 0) {
            return {
                stations: fallbackStations,
                series: fallbackSeries.map(s => ({
                    ...s,
                    points: s.points.map(p => ({ ...p, timeMinutes: toMinutes(p.time) })),
                })),
            };
        }

        const stationMap = new Map(); // stationName -> km
        let nextKm = 0;
        const spacing = 12; // km spacing between successive new stations

        const getKm = (stationName) => {
            if (!stationMap.has(stationName)) {
                stationMap.set(stationName, nextKm);
                nextKm += spacing;
            }
            return stationMap.get(stationName);
        };

        const builtSeries = trainData.slice(0, 6).map((train, idx) => {
            const scheduleEntries = Object.entries(train.schedule || {});
            const path = scheduleEntries.map(([stationName, times]) => {
                const time = normalizeTime(
                    times?.actualArrival ||
                    times?.scheduledArrival ||
                    times?.actualDeparture ||
                    times?.scheduledDeparture
                );
                if (!time) return null;
                return {
                    station: stationName,
                    km: getKm(stationName),
                    time,
                    timeMinutes: toMinutes(time),
                    trainId: train.trainId || train.trainNumber || train.trainName,
                    trainName: train.trainName,
                    trainType: train.trainType,
                };
            }).filter(Boolean);

            // Keep only meaningful paths
            if (path.length < 2) return null;

            // Sort by time to draw proper trajectory
            path.sort((a, b) => (a.timeMinutes || 0) - (b.timeMinutes || 0));

            return {
                id: train.trainName || train.trainNumber || train.trainId || `Train-${idx + 1}`,
                color: palette[idx % palette.length],
                points: path,
            };
        }).filter(Boolean);

        if (builtSeries.length === 0) {
            return {
                stations: fallbackStations,
                series: fallbackSeries.map(s => ({
                    ...s,
                    points: s.points.map(p => ({ ...p, timeMinutes: toMinutes(p.time) })),
                })),
            };
        }

        const stationsArr = Array.from(stationMap.entries()).map(([name, km]) => ({ name, km }));
        stationsArr.sort((a, b) => a.km - b.km);

        return { stations: stationsArr, series: builtSeries };
    }, [trainData]);

    const timeFormatter = (val) => {
        const h = Math.floor(val / 60);
        const m = val % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const TrainTooltip = ({ active, payload }) => {
        if (!active || !payload || !payload.length) return null;
        const p = payload[0].payload;
        const title = p.trainName || p.trainId || 'Train';
        return (
            <div className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-lg text-sm text-gray-800">
                <div className="font-semibold mb-1">{title}</div>
                {p.trainType && <div className="text-xs text-gray-500 mb-1">{p.trainType}</div>}
                <div className="text-xs text-gray-700">Time: {timeFormatter(p.timeMinutes)}</div>
                <div className="text-xs text-gray-700">Station: {p.station}</div>
                <div className="text-xs text-gray-700">Distance: {p.km} km</div>
            </div>
        );
    };

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Time–Distance Graph</h3>
                </div>
                {/* <div className="flex space-x-3 flex-wrap gap-2">
                    {series.map((t) => (
                        <span key={t.id} className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${t.color}22`, color: t.color }}>
                            {t.id}
                        </span>
                    ))}
                </div> */}
            </div>

            <div className="w-full" style={{ height: 430 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, left: 10, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="4 3" stroke="#2f2f3a" />
                        <XAxis
                            type="number"
                            dataKey="timeMinutes"
                            name="Time"
                            tickFormatter={timeFormatter}
                            domain={['dataMin - 5', 'dataMax + 5']}
                            stroke="#9ca3af"
                            label={{ value: 'Time (HH:MM)', position: 'insideBottom', offset: -20, fill: '#9ca3af' }}
                        />
                        <YAxis
                            type="number"
                            dataKey="km"
                            name="Distance"
                            stroke="#9ca3af"
                            label={{ value: 'Distance (km)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                            domain={['dataMin - 2', 'dataMax + 2']}
                        />

                        {stations.map((s) => (
                            <ReferenceLine key={s.name} y={s.km} stroke="#3f3f46" strokeDasharray="3 3" label={{ value: s.name, position: 'left', fill: '#9ca3af', fontSize: 11 }} />
                        ))}

                        <Tooltip
                            cursor={{ strokeDasharray: '3 3', stroke: '#4b5563' }}
                            content={<TrainTooltip />}
                            isAnimationActive={false}
                        />
                        {/* <Legend /> */}
                        {series.map((train) => (
                            <Scatter
                                key={train.id}
                                name={train.id}
                                data={train.points}
                                line
                                shape="circle"
                                stroke={train.color}
                                fill={train.color}
                                strokeWidth={2}
                            />
                        ))}
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default TimeDistanceGraph;


