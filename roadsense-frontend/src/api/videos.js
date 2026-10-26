import { USE_MOCK } from '../config'
import * as mock from '../mocks/inspection'
import client from './client'

export const uploadVideo = (file, onUploadProgress) => {
  if (USE_MOCK) return mock.uploadVideo(file, onUploadProgress)
  const form = new FormData()
  form.append('file', file)
  return client.post('/videos', form, { onUploadProgress }).then((r) => r.data) // { video_id, job_id }
}

export const listVideos = () => (USE_MOCK ? mock.listVideos() : client.get('/videos').then((r) => r.data))
export const getVideo = (id) => client.get(`/videos/${id}`).then((r) => r.data)
export const deleteVideo = (id) => client.delete(`/videos/${id}`)
export const listVideoEvents = (id) =>
  USE_MOCK ? mock.listVideoEvents(id) : client.get(`/videos/${id}/events`).then((r) => r.data)

// Job inference: status queued | processing | done | failed, progress 0-100
export const getJob = (id) => (USE_MOCK ? mock.getJob(id) : client.get(`/jobs/${id}`).then((r) => r.data))
export const listJobs = (params) => client.get('/jobs', { params }).then((r) => r.data)
