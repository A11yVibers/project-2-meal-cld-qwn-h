import React, { useEffect, useState } from 'react';
import { StoreProvider } from './store';
import Catalog from './components/Catalog';
import RecipeDetail from './components/RecipeDetail';
import RecipeForm from './components/RecipeForm';
import Planner from './components/Planner';
import ShoppingList from './components/ShoppingList';

function parseHash(hash) {
  const path = (hash || '').replace(/^#\/?/, '');
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'recipes' && parts[1]) return { view: 'detail', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'new') return { view: 'new' };
  if (parts[0] === 'planner') return { view: 'planner' };
  if (parts[0] === 'shopping') return { view: 'shopping' };
  return { view: 'catalog' };
}

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || '#/recipes');
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/recipes');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return parseHash(hash);
}

function Shell() {
  const route = useHashRoute();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route.view, route.id]);

  const recipesTabActive = route.view === 'catalog' || route.view === 'detail' || route.view === 'new';

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/recipes">
          <span className="brand-mark" aria-hidden="true" />
          Meal Planner
        </a>
        <nav className="main-nav" aria-label="Main">
          <a href="#/recipes" className={recipesTabActive ? 'active' : ''}>Recipes</a>
          <a href="#/planner" className={route.view === 'planner' ? 'active' : ''}>Planner</a>
          <a href="#/shopping" className={route.view === 'shopping' ? 'active' : ''}>Shopping list</a>
          <a href="#/new" className={`btn primary nav-cta ${route.view === 'new' ? 'active' : ''}`}>
            Add recipe
          </a>
        </nav>
      </header>

      <main className="content">
        {route.view === 'catalog' && <Catalog />}
        {route.view === 'detail' && <RecipeDetail id={route.id} />}
        {route.view === 'new' && (
          <RecipeForm onSaved={(id) => { window.location.hash = `#/recipes/${encodeURIComponent(id)}`; }} />
        )}
        {route.view === 'planner' && <Planner />}
        {route.view === 'shopping' && <ShoppingList />}
      </main>

      <footer className="app-footer">
        Recipes, plans, and shopping-list state are saved in your browser (localStorage).
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
