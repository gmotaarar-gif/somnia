import 'package:material_ui/material_ui.dart';

import '../data/articles.dart';
import '../data/store.dart';
import '../theme/tokens.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';
import 'sheet_kit.dart';

/// Article reader: a toned cover, the text, one thing to try, and the next
/// article. "Дальше" reopens the sheet on the next article, from the top.
class ArticleSheet extends StatelessWidget {
  final String? id;
  const ArticleSheet({super.key, this.id});
  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context), c = SomnaColors.of(context);
    final article = articleById(id);
    void close() => store.openSheet(null);
    if (article == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (store.sheet == 'article' && store.sheetArg == id) close();
      });
      return const SizedBox(height: 1);
    }
    final read = store.readArticles.contains(article.id);
    final next = articles[(articles.indexOf(article) + 1) % articles.length];
    return SizedBox(
      height: fullSheetHeight(context),
      child: Column(
        children: [
          SheetHeader(
            title: article.tag,
            description: '${article.min} мин чтения',
            onClose: close,
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SomnaCard(
                    tone: article.tone,
                    radius: SomnaRadii.large,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(minHeight: 172),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          DecoratedBox(
                            decoration: BoxDecoration(
                              color: const Color.fromRGBO(0, 0, 0, .25),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.schedule, size: 14),
                                  const SizedBox(width: 6),
                                  Text(
                                    '${article.min} мин',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.only(top: 32),
                            child: Text(
                              article.title,
                              style: const TextStyle(
                                fontSize: 27,
                                height: 1.08,
                                letterSpacing: -1.08,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(4, 24, 4, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          article.lead,
                          style: TextStyle(
                            fontSize: 17,
                            height: 1.5,
                            color: c.ink,
                          ),
                        ),
                        for (final b in article.blocks) ...[
                          const SizedBox(height: 24),
                          if (b.heading != null) ...[
                            Semantics(
                              header: true,
                              child: Text(
                                b.heading!,
                                style: const TextStyle(
                                  fontSize: 17,
                                  letterSpacing: -.34,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                          ],
                          Text(
                            b.text,
                            style: TextStyle(
                              fontSize: 15,
                              height: 1.6,
                              color: c.ink2,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),
                  GlassSurface(
                    radius: 26,
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Попробуйте сегодня',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: c.accent,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          article.action,
                          style: const TextStyle(
                            fontSize: 16,
                            height: 1.375,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  PressScale(
                    onPressed: () => store.openSheet('article', next.id),
                    child: GlassSurface(
                      radius: 26,
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Дальше · ${next.tag}',
                                  style: TextStyle(fontSize: 12, color: c.ink3),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  next.title,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    height: 1.375,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 16),
                          Icon(Icons.arrow_forward, size: 20, color: c.ink3),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              color: c.sheet,
              border: Border(top: BorderSide(color: c.hair)),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 20),
              child: SheetButton(
                label: read ? 'Закрыть' : 'Прочитано',
                icon: read ? null : Icons.check,
                ghost: read,
                onPressed: () {
                  if (!read) {
                    store.markArticleRead(article.id);
                    store.notify('Статья прочитана');
                  }
                  close();
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
