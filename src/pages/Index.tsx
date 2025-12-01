import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Projects from "./Projects";

const Index = () => {
  const navigate = useNavigate();

  // Redirect to projects page (this is the main entry point)
  useEffect(() => {
    // Index page now shows the projects list
  }, [navigate]);

  return <Projects />;
};

export default Index;
