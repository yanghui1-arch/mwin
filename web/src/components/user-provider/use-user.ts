import { createContext, useContext } from "react";

export interface User {
  userName: string;
  avatar: string;
}

type UserProviderState = {
  user: User | null,
  setUser: (user: User) => void,
  isLoading: boolean,
}

export const userProviderContext = createContext<UserProviderState | null>(null);

export const useUser = () => {
  const userContext = useContext(userProviderContext);
  if (!userContext)
    throw new Error("useUser must be used within a userProviderContext.")
  return userContext;
}
