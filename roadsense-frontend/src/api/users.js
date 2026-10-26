import client from './client'

// params: { role }
export const listUsers = (params) => client.get('/users', { params }).then((r) => r.data)
export const getUser = (id) => client.get(`/users/${id}`).then((r) => r.data)
export const createUser = (data) => client.post('/users', data).then((r) => r.data)
export const updateUser = (id, data) => client.patch(`/users/${id}`, data).then((r) => r.data)
export const deleteUser = (id) => client.delete(`/users/${id}`)
