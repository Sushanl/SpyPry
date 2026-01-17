import { useEffect } from 'react';

const BACKEND_URL = "http://localhost:8000";



export default function Dashboard() {

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch(`${BACKEND_URL}/me`, {
        credentials: "include",
      });
      const data = await response.json();
      console.log(data);
    };
    fetchData();
  }, []);
  return <div>Dashboard</div>;
}