import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import LandingPage from "./LandingPage";
import Projects from "./Projects";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // If user is logged in, show projects. Otherwise show landing page.
  useEffect(() => {
    // Wait for auth to finish loading before deciding
    if (!loading && user) {
      // User is logged in - they'll see Projects component below
    }
  }, [navigate, user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Indlæser...</p>
      </div>
    );
  }

  // Show projects if logged in, otherwise show landing page
  return user ? <Projects /> : <LandingPage />;
};

export default Index;
