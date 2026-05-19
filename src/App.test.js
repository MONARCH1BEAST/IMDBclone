import { render, screen } from "@testing-library/react";
import App from "./App";
import { queryClient } from "./queryClient";

test("renders the movie app shell", () => {
  const { unmount } = render(<App />);
  expect(screen.getByText(/MovieDB/i)).toBeInTheDocument();
  unmount();
  queryClient.clear();
});
