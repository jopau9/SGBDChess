import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    type UserCredential
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

// Define the shape of our user account data
export interface UserAccount {
    uid: string;
    email: string | null;
    username: string;
    chessUsername?: string;
    createdAt: number;
}

/**
 * Registers a new user in Firebase Auth and creates a document in 'accounts' collection.
 */
export async function registerUser(email: string, password: string, username: string): Promise<UserCredential> {
    // 1. Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Update display name in Auth
    await updateProfile(user, {
        displayName: username
    });

    // 3. Create user document in Firestore 'accounts' collection
    const accountData: UserAccount = {
        uid: user.uid,
        email: user.email,
        username: username,
        createdAt: Date.now()
    };

    await setDoc(doc(db, "accounts", user.uid), accountData);

    return userCredential;
}

/**
 * Logs in an existing user.
 */
export async function loginUser(email: string, password: string): Promise<UserCredential> {
    return await signInWithEmailAndPassword(auth, email, password);
}

/**
 * Logs out the current user.
 */
export async function logoutUser(): Promise<void> {
    return await signOut(auth);
}

/**
 * Fetches the user account data from Firestore.
 */
export async function getUserAccount(uid: string): Promise<UserAccount | null> {
    const docRef = doc(db, "accounts", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docSnap.data() as UserAccount;
    } else {
        return null;
    }
}

/**
 * Updates the linked Chess.com username for the user.
 */
export async function updateUserChessUsername(uid: string, chessUsername: string): Promise<void> {
    const docRef = doc(db, "accounts", uid);
    await setDoc(docRef, { chessUsername }, { merge: true });
}
