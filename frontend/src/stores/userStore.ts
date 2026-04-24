import {create} from "zustand";
import type {User} from "#shared/src/types.js";

type UserStore = {
	user: User | null;
	setUser: (user: User) => void;
	clearUser: () => void;
	updateUser: (patch: Partial<User>) => void;
};

export const useUserStore = create<UserStore>((set) => ({
	user: null,
	setUser: (user) => set({user}),
	clearUser: () => set({user: null}),
	updateUser: (patch) =>
		set((state) => ({
			user: state.user ? {...state.user, ...patch} : null,
		})),
}));

export function useCurrentUser() {
	return useUserStore((s) => s.user);
}

export function useSetUser() {
	return useUserStore((s) => s.setUser);
}

export function useClearUser() {
	return useUserStore((s) => s.clearUser);
}

export function useUpdateUser() {
	return useUserStore((s) => s.updateUser);
}
