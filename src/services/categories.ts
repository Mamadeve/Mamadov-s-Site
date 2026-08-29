/**
 * Service — categories (global admin-managed + personal)
 */
import type { Category } from "@/types/database";
import { supabase } from "@/lib/supabase";

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });
  if (error) return [];
  return (data ?? []) as Category[];
}

export async function createCategory(
  name: string,
  color: string | null,
  ownerId: string | null,
): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: name.trim(), color, owner_id: ownerId })
    .select("*")
    .single();
  if (error) throw error;
  return data as Category;
}

export async function updateCategory(id: string, patch: Partial<Category>) {
  return supabase.from("categories").update(patch).eq("id", id);
}

export async function deleteCategory(id: string) {
  return supabase.from("categories").delete().eq("id", id);
}
