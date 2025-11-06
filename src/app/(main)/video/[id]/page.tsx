interface VideoPageProps {
  params: Promise<{ id: string }>;
}

export default async function VideoPage({ params }: VideoPageProps) {
  const { id } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Détail vidéo</h1>
      <p className="text-muted-foreground">
        Page de détail vidéo à implémenter avec VideoPlayer, description et
        suggestions. ID: {id}
      </p>
    </div>
  );
}

