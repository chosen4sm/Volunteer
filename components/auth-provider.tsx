"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isViewer: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isViewer: false,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isViewer, setIsViewer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Check if user is admin in profiles collection
        try {
          const profileRef = doc(db, "profiles", user.uid);
          const profileSnap = await getDoc(profileRef);
          
          if (profileSnap.exists()) {
            const profileData = profileSnap.data();
            console.log("Profile data:", profileData);
            console.log("Setting isAdmin:", profileData.admin === true);
            console.log("Setting isViewer:", profileData.viewer === true);
            setIsAdmin(profileData.admin === true);
            setIsViewer(profileData.viewer === true);
          } else {
            // Create profile with admin: false for new users
            const { setDoc } = await import("firebase/firestore");
            await setDoc(profileRef, {
              email: user.email,
              displayName: user.displayName,
              admin: false,
              viewer: false,
              createdAt: new Date().toISOString(),
            });
            setIsAdmin(false);
            setIsViewer(false);
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
          setIsViewer(false);
        }
      } else {
        setIsAdmin(false);
        setIsViewer(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin, isViewer, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

