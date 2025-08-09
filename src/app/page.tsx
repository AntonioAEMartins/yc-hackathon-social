"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { client } from "@/lib/rpc";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

type Friend = {
  id: number;
  name: string;
  title: string | null;
  phoneNumber: string | null;
  email: string;
  xUsername: string | null;
  instagramUsername: string | null;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await client.api.friends.$get({});
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = (await res.json()) as Friend[];
        if (!cancelled) setFriends(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!friends) return [] as Friend[];
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) =>
      [f.name, f.title ?? "", f.email, f.xUsername ?? "", f.instagramUsername ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [friends, query]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Your friends</h1>
        <AddFriendDialog
          onCreated={(f) => setFriends((prev) => (prev ? [f, ...prev] : [f]))}
        />
      </div>

      <div className="mt-4">
        <Input
          placeholder="Search friends"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading && <div className="text-muted-foreground">Loading...</div>}
        {error && <div className="text-destructive">{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-muted-foreground">No friends found.</div>
        )}
        {!loading && !error &&
          filtered.map((friend) => (
            <Card key={friend.id} className="hover:bg-accent/30">
              <CardHeader className="flex flex-row items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {friend.name
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{friend.name}</CardTitle>
                  <CardDescription>
                    {friend.title ?? "No title"}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground break-words">
                  {friend.email}
                </div>
              </CardContent>
            </Card>
          ))}
      </section>
    </main>
  );
}

// Dialog + Form to create a new friend
function AddFriendDialog({
  onCreated,
}: {
  onCreated: (friend: Friend) => void;
}) {
  const [open, setOpen] = useState(false);

  // Keep client-side form fields as strings to play nicely with inputs.
  const FormSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    email: z.string().email({ message: "Enter a valid email" }),
    title: z.string().optional(),
    phoneNumber: z.string().optional(),
    xUsername: z.string().optional(),
    instagramUsername: z.string().optional(),
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      email: "",
      title: "",
      phoneNumber: "",
      xUsername: "",
      instagramUsername: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof FormSchema>) => {
    const toNull = (v?: string) => (v && v.trim() !== "" ? v : null);
    const payload = {
      name: values.name,
      email: values.email,
      title: toNull(values.title),
      phoneNumber: toNull(values.phoneNumber),
      xUsername: toNull(values.xUsername),
      instagramUsername: toNull(values.instagramUsername),
    };

    const res = await client.api.friends.$post({ json: payload });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Failed with status ${res.status}`);
    }
    const created = (await res.json()) as Friend;
    onCreated(created);
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add a friend</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a new friend</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Ada Lovelace" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="ada@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Engineer" {...field} />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 555-1234" {...field} />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="xUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>X username</FormLabel>
                    <FormControl>
                      <Input placeholder="@ada" {...field} />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instagramUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram username</FormLabel>
                    <FormControl>
                      <Input placeholder="@ada.ig" {...field} />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Adding..." : "Add friend"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}