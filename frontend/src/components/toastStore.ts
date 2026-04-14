import {create} from "zustand";

export type ToastVariant = "error" | "success" | "info";

type Toast = {
	id: number;
	message: string;
	variant: ToastVariant;
};

type ToastStore = {
	assertiveToasts: Toast[];
	politeToasts: Toast[];
	showToast: (variant: ToastVariant, message: string) => void;
	dismiss: (variant: ToastVariant, id: number) => void;
};

let nextId = 0;

export const useToastStore = create<ToastStore>((set) => ({
	politeToasts: [],
	assertiveToasts: [],
	showToast: (variant: ToastVariant, message: string) => {
		const id = nextId++;
		if (variant == "error") set((state) => ({assertiveToasts: [...state.assertiveToasts, {id, message, variant}]}));
		else set((state) => ({politeToasts: [...state.politeToasts, {id, message, variant}]}));
	},
	dismiss: (variant: ToastVariant, id: number) => {
		if (variant === "error") {
			set((state) => ({
				assertiveToasts: state.assertiveToasts.filter((t) => t.id !== id),
			}));
		} else {
			set((state) => ({
				politeToasts: state.politeToasts.filter((t) => t.id !== id),
			}));
		}
	},
}));
