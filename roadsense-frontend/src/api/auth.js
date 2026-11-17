import client from './client'

// Login memakai form-encoded (OAuth2): username = email. Respons: { access_token, token_type, user }
export const login = (email, password) =>
  client.post('/auth/login', new URLSearchParams({ username: email, password })).then((r) => r.data)

// data: { name, email, password } -> user baru (role selalu "user")
export const register = (data) => client.post('/auth/register', data).then((r) => r.data)

export const getMe = () => client.get('/auth/me').then((r) => r.data)
