import client from './client'

// { total_videos, total_events, total_reports, by_status, by_damage_type, completion_rate }
export const getStats = () => client.get('/stats').then((r) => r.data)
export const getMapPoints = (params) => client.get('/stats/map', { params }).then((r) => r.data)
