import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useCaseStudies() {
  return useQuery({
    queryKey: [api.caseStudies.list.path],
    queryFn: async () => {
      const res = await fetch(api.caseStudies.list.path);
      if (!res.ok) throw new Error("Failed to fetch case studies");
      return api.caseStudies.list.responses[200].parse(await res.json());
    },
  });
}
