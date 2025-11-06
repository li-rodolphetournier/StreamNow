import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Logo et description */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">StreamNow</h3>
            <p className="text-sm text-muted-foreground">
              Plateforme VOD moderne pour découvrir et regarder vos films et
              séries préférés.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Accueil
                </Link>
              </li>
              <li>
                <Link
                  href="/search"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Recherche
                </Link>
              </li>
            </ul>
          </div>

          {/* Informations */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">Informations</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>À propos</li>
              <li>Contact</li>
              <li>Mentions légales</li>
            </ul>
          </div>

          {/* Technologie */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">Technologie</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Next.js 15</li>
              <li>TypeScript</li>
              <li>TMDB API</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} StreamNow. Projet de démonstration.
            Données fournies par{" "}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              TMDB
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}

