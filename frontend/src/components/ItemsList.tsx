// src/components/ItemsList.tsx
import { useState, useEffect } from 'react';

interface Item {
  id?: number;
  name: string;
  description?: string;
  price: number;
  tax?: number;
}

export function ItemsList() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/items`);
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        setItems(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Items List</h2>
      {items.length === 0 ? (
        <p>No items found</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <h3>{item.name}</h3>
              {item.description && <p>{item.description}</p>}
              <p>Price: ${item.price}</p>
              {item.tax && <p>Tax: ${item.tax}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}