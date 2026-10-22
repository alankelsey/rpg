// Hash routes keep the build static: #/ is the picker, #/story/<id> is the reader.
export function currentRoute(): { storyId?: string } {
  const match = /^#\/story\/([\w-]+)/.exec(window.location.hash);
  return { storyId: match?.[1] };
}

export function navigate(hash: string) {
  window.location.hash = hash;
}
