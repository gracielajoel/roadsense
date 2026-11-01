import { USE_MOCK } from '../config'
import * as mock from '../mocks/inspection'
import client from './client'

// params: { status, user_id }
export const listReports = (params) =>
  USE_MOCK ? mock.listReports(params) : client.get('/reports', { params }).then((r) => r.data)
export const getReport = (id) => client.get(`/reports/${id}`).then((r) => r.data)
export const getReportHistory = (id) => client.get(`/reports/${id}/history`).then((r) => r.data)
// data: { event_id, road_name, landmark, description }. Pembuat report diambil backend dari token login.
// road_name/landmark/description belum disimpan backend (ReportCreate baru punya event_id)
export const createReport = (data) =>
  USE_MOCK ? mock.createReport(data) : client.post('/reports', data).then((r) => r.data)
// data: { status, note }. Admin yang login tercatat otomatis; foto after-repair lewat POST /reports/{id}/after-photo
export const updateReport = (id, data) => client.patch(`/reports/${id}`, data).then((r) => r.data)
export const deleteReport = (id) => client.delete(`/reports/${id}`)
