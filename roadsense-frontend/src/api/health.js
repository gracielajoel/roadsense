import axios from 'axios'
import { API_BASE_URL } from '../config'

// /health ada di root, bukan di bawah /api/v1
export const getHealth = () => axios.get(`${API_BASE_URL}/health`).then((r) => r.data)
