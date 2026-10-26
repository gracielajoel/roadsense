import client from './client'

// params: { video_id }
export const listEvents = (params) => client.get('/events', { params }).then((r) => r.data)
export const getEvent = (id) => client.get(`/events/${id}`).then((r) => r.data)
export const createEvent = (data) => client.post('/events', data).then((r) => r.data)
// Isi lokasi (latitude/longitude) atau koreksi damage_type
export const updateEvent = (id, data) => client.patch(`/events/${id}`, data).then((r) => r.data)
export const deleteEvent = (id) => client.delete(`/events/${id}`)
