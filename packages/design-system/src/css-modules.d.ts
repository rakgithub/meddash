// The app's Vite build compiles these; this lets the package typecheck on its own.
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
