import Placeholder from '../../components/Placeholder'

export default function VideosPage() {
  return (
    <Placeholder
      title="Videos"
      description="Uploaded inspection footage and inference jobs."
      endpoints={['GET /videos', 'GET /jobs']}
    />
  )
}
