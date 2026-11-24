export function rehypePagesLinks({ base, site }) {
  return function transform(tree) {
    function visit(node) {
      if (node.type === 'element') {
        for (const attribute of ['href', 'src']) {
          const value = node.properties[attribute];
          if (typeof value !== 'string') continue;

          const legacyPath = value.match(/^https?:\/\/(?:www\.)?mannomi\.cloud(\/[^\s]*)?$/i);
          if (legacyPath) {
            node.properties[attribute] = `${site}${base}${legacyPath[1] ?? '/'}`;
          } else if (value.startsWith('/') && !value.startsWith('//')) {
            node.properties[attribute] = `${base}${value}`;
          }
        }
      }
      node.children?.forEach(visit);
    }

    visit(tree);
  };
}
