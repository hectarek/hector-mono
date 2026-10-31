import Image from "next/image";
import { ProduceTile, produceFor } from "@/app/_components/produce-tile";
import { RecipePicture } from "@/app/_components/recipe-picture";
import { RecipeVideo } from "@/app/_components/recipe-video";
import type { Recipe } from "@/src/entities/models/recipe.model";
import { videoThumbnail } from "@/src/entities/video-link";

// The top of a recipe, on its page and on its public link: its photo, its video's thumbnail
// when it has no photo, or its produce tile; a video plays in its place.
export function RecipeCover({
  recipe,
}: {
  recipe: Pick<Recipe, "id" | "title" | "imageUrl" | "videoUrl">;
}) {
  // No photo: its video's thumbnail, the larger one, as the frame crops off its bars.
  const photo =
    recipe.imageUrl ??
    (recipe.videoUrl ? videoThumbnail(recipe.videoUrl, "high") : null);
  const picture = (
    <RecipePicture recipeId={recipe.id}>
      {photo ? (
        <Image
          src={photo}
          alt=""
          width={1280}
          height={720}
          unoptimized
          loading="eager"
          className="bg-muted aspect-video h-auto w-full rounded-xl object-cover"
        />
      ) : (
        <ProduceTile
          produce={produceFor(recipe.id)}
          className="font-heading aspect-video items-end rounded-xl p-5 text-8xl leading-none"
        >
          {recipe.title.charAt(0).toUpperCase()}
        </ProduceTile>
      )}
    </RecipePicture>
  );

  return recipe.videoUrl ? (
    <RecipeVideo link={recipe.videoUrl} title={recipe.title}>
      {picture}
    </RecipeVideo>
  ) : (
    picture
  );
}
