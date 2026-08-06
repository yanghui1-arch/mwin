import { useEffect, useState } from "react";
import { userProviderContext, type User } from "./use-user";
import { MWIN_JWT } from "@/types/storage-const";
import { authApi } from "@/api/auth";

type UserProviderProps = {
  children: React.ReactNode;
};

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAtJwtExpired = (atJwt: string) => {
    const payload = JSON.parse(atob(atJwt.split('.')[1]));
    const exp = payload.exp * 1000;
    return Date.now() > exp;
  }

  useEffect(() => {
    const token = localStorage.getItem(MWIN_JWT);
    let hasValidToken = false;
    try {
      hasValidToken = Boolean(token && !isAtJwtExpired(token));
    } catch (error) {
      console.error("Failed to read authentication token:", error);
    }

    if (token && hasValidToken) {
      const getUserFromJwt = async () => {
        try {
          const response = await authApi.me();
          const code = response.data.code;
          if (code === 200) {
            setUser({ userName: response.data.data.userName, avatar: response.data.data.avatar });
          } else {
            console.error(response.data.message);
          }
        } catch (error) {
          console.error("Failed to load the current user:", error);
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      }
      void getUserFromJwt();
      return;
    }

    setIsLoading(false);
  }, [])

  return (
    <userProviderContext.Provider value={{ user, setUser, isLoading }}>
      {children}
    </userProviderContext.Provider>
  );
}
