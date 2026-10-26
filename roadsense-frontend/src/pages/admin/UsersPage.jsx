import Placeholder from '../../components/Placeholder'

export default function UsersPage() {
  return (
    <Placeholder
      title="Users"
      description="Manage citizens and admins."
      endpoints={['GET /users', 'POST /users', 'PATCH /users/{id}']}
    />
  )
}
