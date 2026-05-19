export const actorSocialLinks = {
  "1190668": {
    instagram: "https://instagram.com/tchalamet",
    twitter: "https://twitter.com/realchalamet",
    imdb: "https://www.imdb.com/name/nm3154303/",
  },
  "505710": {
    instagram: "https://instagram.com/zendaya",
    twitter: "https://twitter.com/zendaya",
    imdb: "https://www.imdb.com/name/nm3918035/",
  },
  "2037": {
    imdb: "https://www.imdb.com/name/nm0614165/",
  },
  "54693": {
    instagram: "https://instagram.com/emmastone",
    imdb: "https://www.imdb.com/name/nm1297015/",
  },
};

export function socialLinksForActor(id) {
  const links = actorSocialLinks[String(id)] || {};
  return Object.entries(links).map(([label, url]) => ({
    label,
    url,
  }));
}
