import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../libs/firebase";
import { getUserAccount, type UserAccount } from "../libs/auth";

type AuthContextType = {
    currentUser: User | null;
    userProfile: UserAccount | null;
    loading: boolean;
    refreshUserProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    currentUser: null,
    userProfile: null,
    loading: true,
    refreshUserProfile: async () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserAccount | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUserProfile = async () => {
        if (currentUser) {
            const profile = await getUserAccount(currentUser.uid);
            setUserProfile(profile);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                // Fetch extra data from Firestore
                const profile = await getUserAccount(user.uid);
                setUserProfile(profile);
            } else {
                setUserProfile(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userProfile,
        loading,
        refreshUserProfile,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
