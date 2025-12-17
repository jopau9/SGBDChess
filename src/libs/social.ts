
import { db } from "./firebase";
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    getDoc,
    getDocs,
    serverTimestamp,
    query,
    orderBy,
} from "firebase/firestore";

export interface FollowedPlayer {
    username: string;
    avatar?: string;
    addedAt?: any;
}

/**
 * Follow a player.
 * Creates a document in `accounts/{uid}/following/{targetUsername}`.
 */
export async function followPlayer(
    currentUserUid: string,
    targetUsername: string,
    targetAvatar: string = ""
): Promise<void> {
    if (!currentUserUid || !targetUsername) return;

    const followingRef = collection(db, "accounts", currentUserUid, "following");
    // Normalize username to lowercase for ID to prevent duplicates/case issues
    const docRef = doc(followingRef, targetUsername.toLowerCase());

    const data: FollowedPlayer = {
        username: targetUsername,
        avatar: targetAvatar,
        addedAt: serverTimestamp(),
    };

    await setDoc(docRef, data);
}

/**
 * Unfollow a player.
 * Deletes the document from `accounts/{uid}/following/{targetUsername}`.
 */
export async function unfollowPlayer(
    currentUserUid: string,
    targetUsername: string
): Promise<void> {
    if (!currentUserUid || !targetUsername) return;

    const followingRef = collection(db, "accounts", currentUserUid, "following");
    const docRef = doc(followingRef, targetUsername.toLowerCase());

    await deleteDoc(docRef);
}

/**
 * Check if the current user is following the target player.
 */
export async function checkIsFollowing(
    currentUserUid: string,
    targetUsername: string
): Promise<boolean> {
    if (!currentUserUid || !targetUsername) return false;

    const followingRef = collection(db, "accounts", currentUserUid, "following");
    const docRef = doc(followingRef, targetUsername.toLowerCase());
    const snap = await getDoc(docRef);

    return snap.exists();
}

/**
 * Get the list of players followed by the current user.
 */
export async function getFollowedPlayers(
    currentUserUid: string
): Promise<FollowedPlayer[]> {
    if (!currentUserUid) return [];

    const followingRef = collection(db, "accounts", currentUserUid, "following");
    // Order by addedAt desc to show most recently followed first
    const q = query(followingRef, orderBy("addedAt", "desc"));

    const snap = await getDocs(q);

    return snap.docs.map((doc) => {
        const data = doc.data();
        return {
            username: data.username, // Use stored strict casing or doc ID
            avatar: data.avatar,
            addedAt: data.addedAt,
        };
    });
}
