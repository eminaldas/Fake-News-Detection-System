export function getProxiedImageUrl(imageUrl, width = 400) {
    if (!imageUrl) return undefined;
    return `/api/v1/proxy/image?url=${encodeURIComponent(imageUrl)}&w=${width}`;
}
